# Security

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely — loaded only in this
  backend process via fail-fast config (packages/config), never sent to
  web-console or logged.
- Login and password-reset-request responses are deliberately generic to
  avoid revealing whether a username exists beyond what a public
  unique-username system already inherently allows (see ADR-009
  Consequences).
- `auth.users.email` is a synthetic, internal-only value
  (`{username}@login.commandai.internal`) — must never be surfaced in any
  API response, log line, or error message. If you find yourself about to
  log or return it, that's a bug.
- Email verification and password reset tokens are single-use
  (`consumed_at`) and time-limited (24h / 1h respectively) — both checked
  on every use, no exceptions for "just this once."
- Password minimum length: 8 characters (Phase 1 baseline — revisit with a
  proper password-strength policy before real users sign up in volume).
