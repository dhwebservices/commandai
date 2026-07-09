"""
This service produces Intent objects only. It never calls policy-engine's
execution path directly and never shells out to run anything itself — that
enforcement boundary lives entirely in policy-engine (see
services/policy-engine). This module's only job is: user request in,
structured Intent out.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel

from app.intents.models import Intent

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
    Phase 1 stub: constructs a well-formed Intent from a request. No LLM
    call wired yet, no execution — this only demonstrates the shape of the
    boundary. Real intent-drafting (LLM-backed) is a Phase 2 feature.
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
