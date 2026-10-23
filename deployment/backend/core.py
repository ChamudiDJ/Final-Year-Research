from pathlib import Path
import json
import os
import joblib
import numpy as np
import pandas as pd
import shap

MODEL_DIR = Path(os.environ.get('MODEL_DIR', Path(__file__).resolve().parents[1] / 'models'))


def load_bundle():
    model = joblib.load(MODEL_DIR / 'h3_pipeline.joblib')
    schema = json.loads((MODEL_DIR / 'schema.json').read_text(encoding='utf-8'))
    if list(model.classes_) != [0, 1, 2] or list(model.feature_names_in_) != schema['features']:
        raise ValueError('Model and questionnaire schema do not agree.')
    return model, schema


def validate(values, features):
    if not isinstance(values, dict) or set(values) != set(features):
        raise ValueError('Answer all 20 questions; use only D01-D20.')
    if all(value is None for value in values.values()):
        raise ValueError('At least one experience response is needed for an estimate.')
    for value in values.values():
        if value is None:
            continue
        if isinstance(value, (bool, str)):
            raise ValueError('Each response must be a whole number from 0 to 4.')
        if not np.isfinite(value) or value != int(value) or not 0 <= value <= 4:
            raise ValueError('Each response must be a whole number from 0 to 4.')
    return pd.DataFrame([[np.nan if values[f] is None else values[f] for f in features]], columns=features, dtype=float)


def estimate(model, schema, values):
    frame = validate(values, schema['features'])
    probability = model.predict_proba(frame)[0]
    if len(probability) != 3 or not np.isfinite(probability).all() or not np.isclose(probability.sum(), 1):
        raise ValueError('Invalid model output.')
    return frame, probability, int(probability.argmax())


def explain(model, schema, frame):
    features = schema['features']
    reference = pd.DataFrame(np.repeat(np.arange(5)[:, None], len(features), axis=1), columns=features, dtype=float)

    def predict(values):
        return model.predict_proba(pd.DataFrame(values, columns=features))

    result = shap.Explainer(predict, reference, algorithm='permutation', seed=42)(frame, max_evals=5 * (2 * len(features) + 1))
    np.testing.assert_allclose(result.base_values + result.values.sum(axis=1), model.predict_proba(frame), atol=1e-6)
    return result


def guidance(category):
    return [
        'If professional support feels difficult to approach, you can first ask your university counselling service about confidentiality, cost, and appointment options. You decide whether and when to contact them.',
        'If you are unsure about professional support, you can ask your university counselling service what a first appointment involves before deciding.',
        'If you would like professional support, you can contact your university counselling service or a qualified mental-health professional to discuss appointment options.'
    ][category]
