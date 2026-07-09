# tenant-service

Tenant/org/RBAC model + Supabase-backed repository (ADR-009). Trust-critical
module — full doc set required.

Core rule: a home user is a tenant with one member — same code path as
MSP/enterprise tenants, not a special case. See Architecture.md.

## Must never depend on
apps/* directly. Only packages/schema, packages/errors,
@supabase/supabase-js. Never holds the Supabase service-role key itself —
callers construct the Supabase client and pass it in.
