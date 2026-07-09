# Architecture

Single `Tenant` shape for every tier (home/business/msp/msp_client/
enterprise). MSPs relate to client tenants via `parentTenantId`, not a
separate data model. Every tenant has >=1 member with role `owner`,
enforced at the schema level (`members.min(1)`) and re-checked via
`assertHasOwner`.

Postgres row-level security will enforce `tenant_id` isolation at the DB
layer (Phase 2 — not yet wired, this package currently defines the model
only, no persistence layer).
