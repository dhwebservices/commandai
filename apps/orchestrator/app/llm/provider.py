"""
Provider-agnostic adapter (RFC-001, decision 2). Orchestrator business
logic (app/intents) depends only on this interface, never on a concrete
provider SDK directly — switching providers later means writing a new
adapter class, not touching call sites.
"""

from abc import ABC, abstractmethod
from pydantic import BaseModel


class DraftedIntentPlan(BaseModel):
    """What an LLM adapter returns: a proposed capability_id + parameters +
    reasoning. This is NOT executable — it still must pass through
    evaluateIntent (policy-engine) before anything happens. See
    Non-Negotiable #2."""

    capability_id: str
    parameters: dict
    reasoning: str


class LLMProvider(ABC):
    @abstractmethod
    async def draft_intent_plan(self, user_request: str, tenant_id: str) -> DraftedIntentPlan:
        """Turns a natural-language request into a proposed Intent plan.
        Must never return anything resembling a shell command or raw code —
        only a capability_id + structured parameters."""
        raise NotImplementedError
