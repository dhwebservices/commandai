"""
Provider-agnostic adapter (RFC-001, decision 2). Orchestrator business
logic (app/intents) depends only on this interface, never on a concrete
provider SDK directly — switching providers later means writing a new
adapter class, not touching call sites.
"""

from abc import ABC, abstractmethod
from pydantic import BaseModel
from app.intents.models import Capability


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
    async def draft_intent_plan(
        self,
        user_request: str,
        tenant_id: str,
        capability_catalog: list[Capability],
    ) -> DraftedIntentPlan:
        """Turns a natural-language request into a proposed Intent plan.
        `capability_catalog` is the tenant's actual registered capabilities
        — implementations must constrain the model to select only from
        this list (e.g. via tool-calling with an enum), never accept a
        free-text capability_id. Must never return anything resembling a
        shell command or raw code — only a capability_id + structured
        parameters."""
        raise NotImplementedError
