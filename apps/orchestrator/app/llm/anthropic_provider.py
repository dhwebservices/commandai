"""
First concrete LLMProvider implementation (RFC-001, decision 2). API key
loaded from env, never hardcoded. Phase 2 stub: builds the request shape
and response parsing; the actual anthropic SDK call and prompt engineering
are follow-up work once tenant-scoped capability catalogs exist for the
model to choose from.
"""

import os
from app.llm.provider import LLMProvider, DraftedIntentPlan


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY is required. Fails fast rather than silently "
                "defaulting, per docs/standards/DESIGN_PRINCIPLES.md config guidance."
            )

    async def draft_intent_plan(self, user_request: str, tenant_id: str) -> DraftedIntentPlan:
        # Phase 2 follow-up: real call to the Anthropic API with the
        # tenant's available Capability catalog as tool definitions, so the
        # model can only select from registered capabilities — never
        # free-text a command. Stub below proves the interface shape only.
        raise NotImplementedError(
            "Real Anthropic API call not yet wired — tracked as Phase 2 follow-up "
            "to RFC-001. Requires tenant-scoped Capability catalog to be "
            "available as tool definitions first."
        )
