import pytest
from unittest.mock import MagicMock, patch
from app.llm.anthropic_provider import AnthropicProvider
from app.intents.models import Capability

CATALOG = [
    Capability(
        id="system.disk.read_usage",
        name="Read Disk Usage",
        description="Reports disk usage statistics.",
        risk_level="read",
        requires_confirmation=False,
        parameter_schema={},
    ),
]


def test_fails_fast_without_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(ValueError):
        AnthropicProvider(api_key=None)


def test_accepts_explicit_api_key():
    provider = AnthropicProvider(api_key="test-key")
    assert provider.api_key == "test-key"


@pytest.mark.asyncio
async def test_rejects_empty_capability_catalog():
    provider = AnthropicProvider(api_key="test-key")
    with pytest.raises(ValueError, match="empty"):
        await provider.draft_intent_plan("check my disk space", "tenant-1", [])


@pytest.mark.asyncio
async def test_draft_intent_plan_happy_path():
    provider = AnthropicProvider(api_key="test-key")

    mock_tool_use = MagicMock()
    mock_tool_use.type = "tool_use"
    mock_tool_use.input = {
        "capability_id": "system.disk.read_usage",
        "parameters": {},
        "reasoning": "User asked to check disk space.",
    }
    mock_response = MagicMock()
    mock_response.content = [mock_tool_use]

    with patch.object(provider._client.messages, "create", return_value=mock_response):
        plan = await provider.draft_intent_plan("check my disk space", "tenant-1", CATALOG)

    assert plan.capability_id == "system.disk.read_usage"
    assert plan.reasoning == "User asked to check disk space."


@pytest.mark.asyncio
async def test_rejects_capability_id_outside_catalog():
    # Defense-in-depth check: even if the model somehow returns an id
    # outside the tool schema's enum, we must refuse it rather than trust
    # the model's output directly (Non-Negotiable #2).
    provider = AnthropicProvider(api_key="test-key")

    mock_tool_use = MagicMock()
    mock_tool_use.type = "tool_use"
    mock_tool_use.input = {
        "capability_id": "system.file.delete_everything",  # not in CATALOG
        "parameters": {},
        "reasoning": "malicious or hallucinated",
    }
    mock_response = MagicMock()
    mock_response.content = [mock_tool_use]

    with patch.object(provider._client.messages, "create", return_value=mock_response):
        with pytest.raises(ValueError, match="not in the tenant's registered catalog"):
            await provider.draft_intent_plan("do something", "tenant-1", CATALOG)


@pytest.mark.asyncio
async def test_raises_if_no_tool_use_block_returned():
    provider = AnthropicProvider(api_key="test-key")

    mock_text_block = MagicMock()
    mock_text_block.type = "text"
    mock_response = MagicMock()
    mock_response.content = [mock_text_block]

    with patch.object(provider._client.messages, "create", return_value=mock_response):
        with pytest.raises(ValueError, match="did not return a tool_use block"):
            await provider.draft_intent_plan("do something", "tenant-1", CATALOG)
