# Deprecated (superseded by ADR-009)

This package (raw pg Pool + explicit SQL migrations against a self-hosted
Postgres) is superseded by ADR-009: Supabase is now the real database.
Tenant/profile/action/audit data lives in the Supabase project
`command-ai` (ref xnmmwqrezspgjspdllzb), accessed via supabase-js with the
service-role client (see apps/api-gateway/src/modules/auth for the
pattern this package's replacement follows).

Kept in the repo for reference and as a fully-offline local dev fallback
only — no live code path in api-gateway/tenant-service/audit-service uses
this package going forward. Do not add new features against it; extend
the Supabase schema (via Supabase migrations) instead.
