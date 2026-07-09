import pytest
from app.llm.anthropic_provider import AnthropicProvider


def test_fails_fast_without_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(ValueError):
        AnthropicProvider(api_key=None)


def test_accepts_explicit_api_key():
    provider = AnthropicProvider(api_key="test-key")
    assert provider.api_key == "test-key"


@pytest.mark.asyncio
async def test_draft_intent_plan_not_yet_implemented():
    provider = AnthropicProvider(api_key="test-key")
    with pytest.raises(NotImplementedError):
        await provider.draft_intent_plan("check my disk space", "tenant-1")
