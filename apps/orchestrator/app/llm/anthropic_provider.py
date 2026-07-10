"""
First concrete LLMProvider implementation (RFC-001, decision 2). API key
loaded from env, never hardcoded. Real Anthropic API call, constrained via
tool-calling so the model can only select a capability_id that's actually
in the tenant's registered catalog — it cannot fabricate one, and it never
produces free-text commands (Non-Negotiable #2).
"""

import os
import anthropic

from app.llm.provider import LLMProvider, DraftedIntentPlan
from app.intents.models import Capability

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 1024
TOOL_NAME = "propose_intent"


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY is required. Fails fast rather than silently "
                "defaulting, per docs/standards/DESIGN_PRINCIPLES.md config guidance."
            )
        self._client = anthropic.Anthropic(api_key=self.api_key)

    def _build_tool(self, capability_catalog: list[Capability]) -> dict:
        # capability_id is an enum of the tenant's ACTUAL registered
        # capabilities — the model cannot select anything outside this
        # list. This is the tool-calling equivalent of policy-engine's
        # capability lookup: constrain at the source, don't just validate
        # after the fact.
        capability_ids = [c.id for c in capability_catalog]
        return {
            "name": TOOL_NAME,
            "description": (
                "Propose a single Intent to fulfill the user's request. "
                "You may ONLY select a capability_id from the provided list "
                "of registered capabilities — never invent one, and never "
                "describe a shell command, script, or code in parameters."
            ),
            "input_schema": {
                "type": "object",
                "properties": {
                    "capability_id": {"type": "string", "enum": capability_ids},
                    "parameters": {
                        "type": "object",
                        "description": "Structured parameters matching the chosen capability's parameter_schema.",
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Plain-language explanation of why this capability fulfills the request. Required for audit — never leave empty.",
                        "minLength": 1,
                    },
                },
                "required": ["capability_id", "parameters", "reasoning"],
            },
        }

    def _catalog_description(self, capability_catalog: list[Capability]) -> str:
        lines = [
            f"- {c.id}: {c.description} (risk: {c.risk_level}, "
            f"requires_confirmation: {c.requires_confirmation})"
            for c in capability_catalog
        ]
        return "\n".join(lines)

    async def draft_intent_plan(
        self,
        user_request: str,
        tenant_id: str,
        capability_catalog: list[Capability],
    ) -> DraftedIntentPlan:
        if not capability_catalog:
            raise ValueError(
                "capability_catalog is empty — cannot draft an Intent with no "
                "registered capabilities to choose from."
            )

        tool = self._build_tool(capability_catalog)
        system = (
            "You are CommandAI's intent-drafting assistant. You NEVER execute "
            "anything yourself and you NEVER produce shell commands, scripts, "
            "or code — you only propose a single structured Intent by calling "
            f"the {TOOL_NAME} tool, selecting a capability_id strictly from "
            f"this tenant's registered capabilities:\n\n"
            f"{self._catalog_description(capability_catalog)}\n\n"
            "If no listed capability genuinely fulfills the request, choose "
            "the closest read-only capability and explain the mismatch in "
            "reasoning — never fabricate a capability_id that isn't listed."
        )

        response = self._client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            tools=[tool],
            tool_choice={"type": "tool", "name": TOOL_NAME},
            messages=[{"role": "user", "content": user_request}],
        )

        tool_use = next(
            (block for block in response.content if block.type == "tool_use"),
            None,
        )
        if tool_use is None:
            raise ValueError("Model did not return a tool_use block — cannot draft an Intent.")

        proposed_id = tool_use.input.get("capability_id")
        valid_ids = {c.id for c in capability_catalog}
        if proposed_id not in valid_ids:
            # Defense in depth: the tool schema's enum should have already
            # constrained this, but never trust a single layer for
            # something this security-relevant (mirrors policy-engine's
            # own capability-mismatch check).
            raise ValueError(
                f"Model proposed capability_id '{proposed_id}' which is not in "
                "the tenant's registered catalog — refusing to draft this Intent."
            )

        return DraftedIntentPlan(
            capability_id=proposed_id,
            parameters=tool_use.input.get("parameters", {}),
            reasoning=tool_use.input.get("reasoning", ""),
        )
