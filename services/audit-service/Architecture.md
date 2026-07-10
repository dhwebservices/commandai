# Architecture

Phase 1: in-memory `AuditLog` (append-only, no update/delete methods
exposed) remains the default for tests and local single-instance use.
`SupabaseAuditLog` (supabase-audit-log.ts) is the **production default**
as of ADR-009 — api-gateway's IntentsModule provides it via the `AUDIT_LOG`
injection token, using the service-role Supabase client. `PostgresAuditLog`
(raw pg against local Postgres) is deprecated (see packages/db/DEPRECATED.md)
and kept only for reference. All three implement the same
`AuditWriter`/`AuditReader` shape, so `recordTransition`/
`findExecutedWithoutAudit` work against any of them unchanged.

`recordTransition` refuses (throws) rather than logs an invalid state
transition — see packages/schema `isValidTransition`.

`findExecutedWithoutAudit` implements the ADR-006 gap-detection
requirement: Executed and Audited are separate states specifically so this
failure mode (execution succeeded, audit write failed) is detectable. This
function is intended to run as a periodic monitoring job, not inline on
the request path.

Subscribes to NATS lifecycle-transition events in Phase 2 (not wired yet —
see ADR-005, pending confirmation).

## upsertAction (added)
`AuditWriter.upsertAction?` is optional on the interface — `SupabaseAuditLog`
implements it (writes to the `actions` table), the in-memory `AuditLog`
does not (no-op via optional chaining at call sites). This keeps the
`actions` table populated in production without forcing test code to care.

## NATS wiring (now connected)
apps/api-gateway now actually calls `publishTransition` after each
`recordTransition` (both intents.controller.ts and
confirm-intent.controller.ts), via a best-effort NATS connection
(NATS_CONNECTION token, apps/api-gateway/src/modules/intents/nats-connection.provider.ts).
A NATS outage never fails the request — it's a real-time notification
channel, not the audit-of-record (the DB write already succeeded by the
time we'd publish). Previously this transport existed but nothing called it.
