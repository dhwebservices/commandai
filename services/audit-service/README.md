# audit-service

Immutable append-only log of Action state transitions (ADR-006). Trust-critical
module — full doc set required.

## Must never depend on
apps/* directly. Only packages/schema, packages/errors, packages/logger.
