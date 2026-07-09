# @commandai/db

Postgres connection pool + explicit SQL migration runner. No ORM — plain
.sql files in infra/db/migrations, applied in order, tracked in
schema_migrations (Design Principle: explicit over magic).

`withTenantContext(pool, tenantId, fn)` sets the `app.tenant_id` session
variable that RLS policies key off — the sanctioned way to issue
tenant-scoped queries (see infra/db/migrations/0001_create_tenants.sql).

## Must never depend on
Any app or service package.
