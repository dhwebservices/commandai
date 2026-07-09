# Testing

Unit tests (tenant.repository.test.ts) mock the Supabase client: fetching
a tenant with derived members, and nonexistent-tenant returning null.
Not yet covered (tracked follow-up): updateBlockedCapabilities and
addMember unit tests, and integration tests against a real Supabase
branch. Coverage gate: 80% (trust-critical tier) — not yet measured,
pending `pnpm install` in an environment with network access.
