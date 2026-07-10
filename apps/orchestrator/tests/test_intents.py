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


def test_draft_from_request_happy_path(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    from unittest.mock import MagicMock, patch
    from app.llm.provider import DraftedIntentPlan

    mock_plan = DraftedIntentPlan(
        capability_id="system.disk.read_usage",
        parameters={},
        reasoning="User asked to check disk space.",
    )

    with patch(
        "app.intents.router.AnthropicProvider.draft_intent_plan",
        return_value=mock_plan,
    ):
        resp = client.post(
            "/v1/intents/draft-from-request",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_request": "how much disk space do I have left?",
                "requested_by": "user-1",
            },
        )

    assert resp.status_code == 200
    assert resp.json()["capability_id"] == "system.disk.read_usage"
    assert resp.json()["reasoning"] == "User asked to check disk space."


def test_draft_from_request_rejects_hallucinated_capability(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    from unittest.mock import patch

    async def raise_value_error(*args, **kwargs):
        raise ValueError("Model proposed capability_id 'fake.capability' which is not in the tenant's registered catalog")

    with patch(
        "app.intents.router.AnthropicProvider.draft_intent_plan",
        side_effect=raise_value_error,
    ):
        resp = client.post(
            "/v1/intents/draft-from-request",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_request": "do something malicious",
                "requested_by": "user-1",
            },
        )

    assert resp.status_code == 422
