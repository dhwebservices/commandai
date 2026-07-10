-- Applied to Supabase project "command-ai" (ref xnmmwqrezspgjspdllzb) via
-- Supabase MCP on 2026-07-09. Committed here after the fact so schema
-- changes are versioned in git, not just live in the dashboard — see
-- Non-Negotiable #5. Do not re-run manually; new schema changes should add
-- a new numbered file here AND be applied via Supabase MCP/CLI together.

-- Tenant-of-one is the default shape (Design Principle #3): every tenant,
-- home user or enterprise, uses this same table.
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('home', 'business', 'msp', 'msp_client', 'enterprise')),
  parent_tenant_id uuid references tenants(id),
  blocked_capability_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Profiles extend auth.users (Supabase Auth handles password hashing,
-- sessions, JWTs). username is the real login identifier the user types;
-- auth.users.email is a synthetic, internal-only address
-- (see apps/api-gateway/src/modules/auth/AUTH_DESIGN.md) — never used for
-- actual delivery. contact_email is the real address Resend sends
-- verification/reset emails to.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  contact_email text not null,
  tenant_id uuid not null references tenants(id),
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')) default 'owner',
  email_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_profiles_tenant_id on profiles(tenant_id);
create unique index idx_profiles_username_lower on profiles (lower(username));

alter table tenants enable row level security;
alter table profiles enable row level security;

-- Users can see their own tenant and profile only. Broader MSP visibility
-- (parent tenant seeing clients) is deferred — Phase 2, needs an explicit
-- membership/grant check, not inferred from parent_tenant_id alone
-- (see services/tenant-service/Security.md).
create policy tenants_self_select on tenants
  for select using (
    id in (select tenant_id from profiles where profiles.id = auth.uid())
  );

create policy profiles_self_select on profiles
  for select using (id = auth.uid());

create policy profiles_self_update on profiles
  for update using (id = auth.uid());
