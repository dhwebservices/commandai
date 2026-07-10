"""
This service produces Intent objects only. It never calls policy-engine's
execution path directly and never shells out to run anything itself — that
enforcement boundary lives entirely in policy-engine (see
services/policy-engine). This module's only job is: user request in,
structured Intent out.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.intents.models import Intent
from app.intents.capability_registry import all_capabilities
from app.llm.anthropic_provider import AnthropicProvider

router = APIRouter(prefix="/v1/intents", tags=["intents"])


class DraftIntentRequest(BaseModel):
    tenant_id: str
    capability_id: str
    parameters: dict
    reasoning: str
    requested_by: str


@router.post("", response_model=Intent)
def draft_intent(payload: DraftIntentRequest) -> Intent:
    """
    Manual construction — the caller already knows which capability it
    wants (e.g. a UI button, not natural language). Demonstrates the
    Intent shape without an LLM call. See /draft-from-request below for
    the actual LLM-backed path.
    """
    return Intent(
        id=str(uuid.uuid4()),
        tenant_id=payload.tenant_id,
        capability_id=payload.capability_id,
        parameters=payload.parameters,
        reasoning=payload.reasoning,
        requested_by=payload.requested_by,
        created_at=datetime.now(timezone.utc),
    )


class DraftFromRequestRequest(BaseModel):
    tenant_id: str
    user_request: str
    requested_by: str


@router.post("/draft-from-request", response_model=Intent)
async def draft_from_request(payload: DraftFromRequestRequest) -> Intent:
    """
    Real LLM-backed drafting (RFC-001, decision 2). Turns natural language
    into a structured Intent via AnthropicProvider, constrained to the
    tenant's registered capability catalog (Non-Negotiable #2 — the model
    can only select a capability_id that already exists, never invent a
    command). The returned Intent still has NOT been executed — it must
    pass through policy-engine's evaluateIntent before anything happens.

    Note: capability_catalog here is the Phase 1 static registry
    (app/intents/capability_registry.py), not yet tenant-scoped —
    tracked follow-up once a shared Capability store exists.
    """
    provider = AnthropicProvider()  # fails fast if ANTHROPIC_API_KEY is missing
    catalog = all_capabilities()

    try:
        plan = await provider.draft_intent_plan(payload.user_request, payload.tenant_id, catalog)
    except ValueError as e:
        # A rejected/hallucinated capability_id or empty catalog surfaces
        # as a client-visible 422, not a silent fallback to something the
        # model "probably meant" — see AnthropicProvider's defense-in-depth check.
        raise HTTPException(status_code=422, detail=str(e))

    return Intent(
        id=str(uuid.uuid4()),
        tenant_id=payload.tenant_id,
        capability_id=plan.capability_id,
        parameters=plan.parameters,
        reasoning=plan.reasoning,
        requested_by=payload.requested_by,
        created_at=datetime.now(timezone.utc),
    )
