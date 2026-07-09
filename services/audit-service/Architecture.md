# Architecture

Phase 1: in-memory `AuditLog` (append-only, no update/delete methods
exposed) remains the default for tests and local single-instance use.
`PostgresAuditLog` (postgres-audit-log.ts) is now also available — same
`append`/`forAction` shape via the `AuditWriter`/`AuditReader` interfaces,
so `recordTransition`/`findExecutedWithoutAudit` work against either
without callers caring which. Writes/reads go through
`withTenantContext` (packages/db) so RLS applies (Phase 2: audit-service
switches to this by default once deployed as a real, shared service).

`recordTransition` refuses (throws) rather than logs an invalid state
transition — see packages/schema `isValidTransition`.

`findExecutedWithoutAudit` implements the ADR-006 gap-detection
requirement: Executed and Audited are separate states specifically so this
failure mode (execution succeeded, audit write failed) is detectable. This
function is intended to run as a periodic monitoring job, not inline on
the request path.

Subscribes to NATS lifecycle-transition events in Phase 2 (not wired yet —
see ADR-005, pending confirmation).
