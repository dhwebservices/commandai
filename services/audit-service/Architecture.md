# Architecture

Phase 1: in-memory `AuditLog` (append-only, no update/delete methods
exposed). Phase 2: backed by Postgres append-only table — DB role for this
service will not have UPDATE/DELETE grants at all, enforced at the
database level, not just application code.

`recordTransition` refuses (throws) rather than logs an invalid state
transition — see packages/schema `isValidTransition`.

`findExecutedWithoutAudit` implements the ADR-006 gap-detection
requirement: Executed and Audited are separate states specifically so this
failure mode (execution succeeded, audit write failed) is detectable. This
function is intended to run as a periodic monitoring job, not inline on
the request path.

Subscribes to NATS lifecycle-transition events in Phase 2 (not wired yet —
see ADR-005, pending confirmation).
