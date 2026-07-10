# Testing

Unit tests (tenant.repository.test.ts) mock the Supabase client. Covers:
fetching a tenant with derived members, nonexistent-tenant returning null,
updateBlockedCapabilities (success + failure path), and addMember (success
+ tenant-not-found rejection).

Not yet covered (tracked follow-up): integration test against a real
Supabase branch. Coverage gate: 80% (trust-critical tier) — not yet
measured, pending `pnpm install` in an environment with network access.
