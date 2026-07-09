# API

## `evaluateIntent(intent, capability, overrides?) -> PolicyDecision`
Returns `{ allowed, requiresConfirmation, reason }`. Never throws for a
normal denial — denial is a valid, expected return value. Throws
`PolicyDeniedError` only for structural misuse (e.g. intent/capability
mismatch).

## `assertAllowed(decision, capability, intent) -> void`
Throws `PolicyDeniedError` if `decision.allowed` is false. Use this at the
actual enforcement boundary (right before execution) so denial always
becomes a typed, catchable error there.

No HTTP surface yet in Phase 1 — this is consumed as a library by
api-gateway/orchestrator. gRPC/REST wrapper to be added when policy-engine
is deployed as an independent service (tracked for Phase 2, will require
API versioning per Non-Negotiable #4 at that point).
