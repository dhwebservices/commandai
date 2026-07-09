# Testing

Unit tests (auth.service.test.ts) mock the Supabase admin/anon clients and
EmailService, covering: duplicate-username rejection, successful signup
(tenant + auth user + profile + verification email), generic error for
nonexistent username on login (no enumeration signal), and successful
login returning a session.

Not yet covered (tracked follow-up): verifyEmail/requestPasswordReset/
resetPassword unit tests, and an integration test against a real (or
Supabase-branch) database. Coverage gate: 80% (trust-critical tier) — not
yet measured, pending `pnpm install` in an environment with network access.
