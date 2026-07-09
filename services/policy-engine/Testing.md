# Testing

## Unit tests (`src/modules/evaluate/evaluate.test.ts`)
Cover: read-capability allow, missing-reasoning denial, destructive requires
confirmation, tenant-blocked capability denial, intent/capability mismatch,
`assertAllowed` throwing.

## Security test suite (required, see docs/standards)
A dedicated suite whose job is attempting to get an Intent executed without
going through `evaluateIntent`/`assertAllowed`. To be added once
api-gateway/orchestrator call sites exist — tracked, not yet built (nothing
calls this service yet in Phase 1).

## Coverage gate
80% minimum for this package (trust-critical tier).
