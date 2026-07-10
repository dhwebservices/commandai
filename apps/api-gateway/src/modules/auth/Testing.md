# Testing

Unit tests (auth.service.test.ts) mock the Supabase admin/anon clients and
EmailService. Covers: duplicate-username rejection, successful signup
(tenant + auth user + profile + verification email), generic login error
for nonexistent username (no enumeration signal), successful login
returning a session, email verification (success, expired token, consumed
token, nonexistent token), password reset request (enumeration-safe
generic response, real-user token+email path), and password reset
(success, expired/consumed token rejection).

Not yet covered (tracked follow-up): integration test against a real
Supabase branch/project. Coverage gate: 80% (trust-critical tier) — not
yet measured, pending `pnpm install` in an environment with network access.
