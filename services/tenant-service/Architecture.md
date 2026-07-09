# Architecture

Single `Tenant` shape for every tier (home/business/msp/msp_client/
enterprise). Per ADR-009, persistence is Supabase (project "command-ai"),
not local Postgres — `TenantRepository` uses supabase-js, matching the
pattern in apps/api-gateway/src/modules/auth.

Tenant *creation* happens in auth.service.ts's signup flow (tenant +
owner profile created together) — TenantRepository does not duplicate
creation, it's read/management only (findById, updateBlockedCapabilities,
addMember for future invite flows).

"Members" are derived from `profiles` rows (tenant_id FK) — there's no
separate tenant_members table in the Supabase schema; one profile per
user already carries tenant_id + role. `assertHasOwner` is re-checked
after any membership change in `addMember`.
