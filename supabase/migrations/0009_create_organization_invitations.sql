-- Create organization invitations table for staff to join organizations
create table organization_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null unique, -- 6-digit invitation code
  email text not null, -- invited person's email
  role text not null check (role in ('admin', 'member', 'viewer')) default 'member',
  created_by uuid references profiles(id),
  consumed_by uuid references profiles(id),
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_org_invitations_tenant_id on organization_invitations(tenant_id);
create index idx_org_invitations_code on organization_invitations(code);
create index idx_org_invitations_email on organization_invitations(email);

-- RLS policies
alter table organization_invitations enable row level security;

-- Organization owners/admins can view their org's invitations
create policy org_invitations_select on organization_invitations
  for select using (
    tenant_id in (
      select tenant_id from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('owner', 'admin')
    )
  );

-- Organization owners/admins can create invitations
create policy org_invitations_insert on organization_invitations
  for insert with check (
    tenant_id in (
      select tenant_id from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('owner', 'admin')
    )
  );
