"""
Phase 1 in-memory seed, mirrors apps/api-gateway/src/modules/intents/
capability-registry.ts. Phase 2: both should load from a shared Capability
store (Postgres/Supabase) instead of two hand-kept copies — tracked
follow-up, not fixed here to avoid scope creep on top of the LLM wiring.
"""

from app.intents.models import Capability

REGISTRY: dict[str, Capability] = {
    "system.disk.read_usage": Capability(
        id="system.disk.read_usage",
        name="Read Disk Usage",
        description="Reports disk usage statistics.",
        risk_level="read",
        requires_confirmation=False,
        parameter_schema={},
    ),
    "system.file.delete": Capability(
        id="system.file.delete",
        name="Delete File",
        description="Deletes a file from disk.",
        risk_level="destructive",
        requires_confirmation=True,
        parameter_schema={"path": "string"},
    ),
}


def all_capabilities() -> list[Capability]:
    return list(REGISTRY.values())
