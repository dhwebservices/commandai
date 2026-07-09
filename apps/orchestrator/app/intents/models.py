"""
Mirrors packages/schema/src/intent-capability.ts. TS is the source of
truth (see packages/schema/GLOSSARY.md) — keep these in sync manually until
codegen from a shared IDL is set up (tracked, not yet built in Phase 1).
"""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


CapabilityRiskLevel = Literal["read", "mutate", "destructive"]


class Capability(BaseModel):
    id: str
    name: str
    description: str
    risk_level: CapabilityRiskLevel
    requires_confirmation: bool
    parameter_schema: dict


class Intent(BaseModel):
    """
    The only artifact this service is permitted to produce. Never a shell
    command or arbitrary code — always a reference to a registered
    Capability plus typed parameters and required reasoning.
    See Non-Negotiable #2.
    """

    id: str
    tenant_id: str
    capability_id: str
    parameters: dict
    reasoning: str = Field(min_length=1, description="Required for auditability.")
    requested_by: str
    created_at: datetime
