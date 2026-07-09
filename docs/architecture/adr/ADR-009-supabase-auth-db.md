# ADR-009: Supabase for Postgres + Auth (supersedes local-only Postgres path)
Status: Accepted (founder-directed)
Date: 2026-07-09

## Context
Founder directed connecting the Supabase MCP project ("command-ai") as the
real database and using it for authentication (username/password login),
with Resend for transactional email delivery. This is an RFC-trigger
(new core data store decision + auth model) per docs/architecture/RFC_PROCESS.md,
recorded here as founder-directed rather than pre-approved via the normal
RFC flow, since the instruction was explicit and immediate.

## Decision
- Supabase Postgres is now the actual database (project ref
  `xnmmwqrezspgjspdllzb`), not the local Docker Postgres from ADR-001/002
  era `infra/db/migrations`. Those local migrations remain in the repo for
  fully-offline dev only; schema changes must be applied to both if kept
  in sync, or the local path should be formally retired (open follow-up,
  see Consequences).
- Supabase Auth (`auth.users`) handles password hashing, sessions, and JWT
  issuance. Users log in with a **username**, not an email — `auth.users.email`
  is populated with a synthetic, internal-only address
  (`{username}@login.commandai.internal`), never used for real delivery.
  The user's real contact address lives in `profiles.contact_email`.
- Because `auth.users.email` is synthetic, Supabase's built-in
  confirmation/recovery emails don't apply. `email_verification_tokens`
  and `password_reset_tokens` tables + Resend handle that flow instead
  (see apps/api-gateway/src/modules/auth/AUTH_DESIGN.md).
- Resend sends all transactional auth email, from the verified domain
  `dhwebsiteservices.co.uk`, using a sending-only scoped API key.

## Alternatives Considered
- Real email as the Supabase Auth identity, with username as a display
  field only — rejected per explicit founder direction that users log in
  with a username.
- Building password hashing/session issuance ourselves — rejected: no
  reason to reinvent what Supabase Auth already does correctly, and doing
  so ourselves would be a larger security surface for no product benefit.

## Consequences
- Local Docker Postgres path (infra/db/migrations, packages/db) is now
  redundant for anything auth/tenant-related. Recommend a follow-up RFC to
  formally retire it or repurpose it as a local-only offline fallback —
  not resolved in this ADR to avoid scope creep on top of an already
  founder-directed change.
- Username-enumeration is a known, accepted trade-off of username-based
  login (confirmed by password-reset/login error messages being
  necessarily generic — "invalid username or password" rather than
  revealing which part was wrong).
- Service-role Supabase key is powerful (bypasses RLS) — must never reach
  the browser/web-console; only api-gateway's backend process holds it.
