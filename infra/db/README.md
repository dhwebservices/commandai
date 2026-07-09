# infra/db/migrations

Plain SQL migrations, applied via `pnpm db:migrate` (packages/db/src/migrate.ts).
Every schema change goes through a new numbered file here — no manual
schema edits, in any environment (Non-Negotiable #5).

Current tables: tenants, tenant_members, actions, audit_events. All
tenant-scoped tables have RLS policies keyed on `app.tenant_id`
(app-layer filtering is defense in depth, not a substitute).
