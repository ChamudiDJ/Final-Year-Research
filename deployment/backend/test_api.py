import numpy as np
import pytest
from fastapi.testclient import TestClient
from .main import app
from .core import validate, load_bundle, estimate, explain

FEATURES = [f'D{i:02d}' for i in range(1, 21)]


@pytest.fixture(scope='module')
def client():
    with TestClient(app) as session:
        assert session.get('/api/health').status_code == 200, 'Export the evaluated Colab model before integration testing.'
        yield session


@pytest.mark.parametrize('value', [-1, 5, 1.5, float('nan'), float('inf'), True, '2'])
def test_invalid_scale(value):
    with pytest.raises(ValueError):
        validate(dict.fromkeys(FEATURES, value), FEATURES)


def test_missing_and_extra_features():
    with pytest.raises(ValueError):
        validate({}, FEATURES)
    with pytest.raises(ValueError):
        validate({**dict.fromkeys(FEATURES, 0), 'H3': 5}, FEATURES)
    with pytest.raises(ValueError):
        validate(dict.fromkeys(FEATURES, None), FEATURES)


@pytest.mark.parametrize('value', [0, 1, 2, 3, 4])
def test_prediction_contract(client, value):
    response = client.post('/api/predict', json={'eligible': True, 'responses': dict.fromkeys(FEATURES, value)})
    assert response.status_code == 200
    result = response.json()
    assert result['category'] in [0, 1, 2] and len(result['probabilities']) == 3
    assert np.isclose(sum(result['probabilities']), 1)
    assert all(0 <= p <= 1 for p in result['probabilities'])
    assert len(result['contributions']) == 20 and result['guidance']
    total = result['reference_probability'] + sum(c['value'] for c in result['contributions'])
    assert np.isclose(total, result['probabilities'][result['category']], atol=1e-6)
    assert response.headers['Cache-Control'] == 'no-store'


@pytest.mark.parametrize('payload', [
    {'eligible': False, 'responses': dict.fromkeys(FEATURES, 0)},
    {'eligible': True, 'responses': {}},
    {'eligible': True, 'responses': dict.fromkeys(FEATURES, 5)},
    {'eligible': True, 'responses': dict.fromkeys(FEATURES, True)},
    {'eligible': True, 'responses': dict.fromkeys(FEATURES, '2')},
    {'eligible': True, 'responses': {**dict.fromkeys(FEATURES, 0), 'H3': 7}},
    {'eligible': True, 'responses': dict.fromkeys(FEATURES, 0), 'name': 'unnecessary'}
])
def test_api_rejects_invalid_input(client, payload):
    assert client.post('/api/predict', json=payload).status_code == 422


def test_schema_matches_trained_pipeline(client):
    schema = client.get('/api/questionnaire').json()
    assert schema['features'] == FEATURES and len(schema['questions']) == 20
    assert len(schema['labels']) == 3 and 'H3' not in schema['features']
    model, saved = load_bundle()
    frame, expected, _ = estimate(model, saved, dict.fromkeys(FEATURES, 2))
    actual = client.post('/api/predict', json={'eligible': True, 'responses': dict.fromkeys(FEATURES, 2)}).json()
    np.testing.assert_allclose(actual['probabilities'], expected)


def test_explicit_nonresponse_uses_saved_preprocessing(client):
    values = dict.fromkeys(FEATURES, 2)
    values['D01'] = None
    response = client.post('/api/predict', json={'eligible': True, 'responses': values})
    assert response.status_code == 200
    model, schema = load_bundle()
    frame, expected, _ = estimate(model, schema, values)
    assert np.isnan(frame.iloc[0, 0])
    np.testing.assert_allclose(response.json()['probabilities'], expected)
