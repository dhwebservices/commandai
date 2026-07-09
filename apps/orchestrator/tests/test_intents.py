from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_draft_intent_requires_reasoning():
    resp = client.post(
        "/v1/intents",
        json={
            "tenant_id": "11111111-1111-1111-1111-111111111111",
            "capability_id": "system.disk.read_usage",
            "parameters": {},
            "reasoning": "",
            "requested_by": "user-1",
        },
    )
    assert resp.status_code == 422  # empty reasoning rejected by Pydantic min_length


def test_draft_intent_happy_path():
    resp = client.post(
        "/v1/intents",
        json={
            "tenant_id": "11111111-1111-1111-1111-111111111111",
            "capability_id": "system.disk.read_usage",
            "parameters": {},
            "reasoning": "User asked to check disk space.",
            "requested_by": "user-1",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["capability_id"] == "system.disk.read_usage"
