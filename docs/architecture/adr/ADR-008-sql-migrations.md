# ADR-008: Explicit SQL migrations over an ORM
Status: Accepted
Date: 2026-07-09

## Context
Non-Negotiable #5 requires every schema change to go through a migration.
Tenant-scoped tables also need RLS policies, which are easiest to express
and reason about as plain SQL.

## Decision
Numbered .sql files in infra/db/migrations, applied by a small custom
runner (packages/db/src/migrate.ts) that tracks applied files in a
schema_migrations table. No ORM.

## Alternatives Considered
Prisma/TypeORM — rejected: ORMs add a layer of generated/inferred behavior
that obscures exactly what RLS policies and grants are in effect, which
conflicts with "explicit over magic" and makes the audit_events
append-only guarantee (grant-level REVOKE UPDATE/DELETE) harder to express
and verify directly.

## Consequences
Slightly more manual work per schema change (hand-written SQL, no
auto-generated migration diffing). Accepted given how load-bearing the RLS
and grant-level guarantees are for this product.
