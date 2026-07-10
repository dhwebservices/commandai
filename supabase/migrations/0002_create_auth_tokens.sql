-- Applied to Supabase project "command-ai" via Supabase MCP on 2026-07-09.
-- See 0001 header note on versioning convention.

-- Since auth.users.email is synthetic (see AUTH_DESIGN.md), Supabase's
-- built-in email-confirmation/password-recovery flows don't apply. We
-- issue our own single-use tokens and deliver them via Resend.
create table email_verification_tokens (
  token uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table password_reset_tokens (
  token uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_evt_profile_id on email_verification_tokens(profile_id);
create index idx_prt_profile_id on password_reset_tokens(profile_id);

-- These tables are only ever written/read by the backend using the
-- service role (bypasses RLS by design) — never queried directly by a
-- logged-in user's session, so no user-facing RLS policy is defined here.
-- RLS is still enabled so any accidental non-service-role access is
-- denied by default rather than silently allowed.
alter table email_verification_tokens enable row level security;
alter table password_reset_tokens enable row level security;
