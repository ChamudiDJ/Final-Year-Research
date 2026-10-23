from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock
import logging
import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, StrictBool, StrictInt
from .core import load_bundle, estimate, explain, guidance

logger = logging.getLogger(__name__)
explanation_lock = Lock()


@asynccontextmanager
async def lifespan(app):
    try:
        app.state.bundle = load_bundle()
    except (OSError, ValueError, TypeError, ImportError):
        logger.error('Trained model could not be loaded.')
        app.state.bundle = None
    yield
    app.state.bundle = None


app = FastAPI(title='Professional Help-Seeking Intention DSS', version='1.0.0', lifespan=lifespan)


@app.middleware('http')
async def privacy_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
    return response


@app.exception_handler(Exception)
async def unexpected_error(request, error):
    logger.error('Assessment request failed (%s).', type(error).__name__)
    return JSONResponse(status_code=500, content={'detail': 'The assessment is temporarily unavailable. Please try again later.'})


def bundle(request):
    loaded = getattr(request.app.state, 'bundle', None)
    if loaded is None:
        raise HTTPException(503, 'The evaluated model is not available yet.')
    return loaded


class Assessment(BaseModel):
    model_config = ConfigDict(extra='forbid')
    eligible: StrictBool
    responses: dict[str, StrictInt | None]


@app.get('/api/health')
def health(request: Request):
    bundle(request)
    return {'status': 'ok'}


@app.get('/api/questionnaire')
def questionnaire(request: Request):
    _, schema = bundle(request)
    return {k: schema[k] for k in ['title', 'features', 'questions', 'labels', 'scale', 'reference', 'model', 'test_metrics', 'development_n', 'test_n', 'interpretation']}


@app.post('/api/predict')
def predict(payload: Assessment, request: Request):
    if not payload.eligible:
        raise HTTPException(422, 'Confirm eligibility and your choice to continue.')
    model, schema = bundle(request)
    try:
        frame, probabilities, category = estimate(model, schema, payload.responses)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    # SHAP uses a seeded random state; serialize explanations for reproducibility.
    with explanation_lock:
        explanation = explain(model, schema, frame)
    contributions = explanation.values[0, :, category]
    order = np.argsort(-np.abs(contributions))
    return {'category': category, 'label': schema['labels'][category],
            'probabilities': probabilities.tolist(), 'guidance': guidance(category),
            'reference_probability': float(explanation.base_values[0, category]),
            'reference': schema['reference'],
            'contributions': [{'feature': schema['features'][i], 'value': float(contributions[i])} for i in order]}


dist = Path(__file__).resolve().parents[1] / 'frontend' / 'dist'
if dist.is_dir():
    app.mount('/', StaticFiles(directory=dist, html=True), name='frontend')
