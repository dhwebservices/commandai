-- Applied to Supabase project "command-ai" via Supabase MCP on 2026-07-09.
-- See 0001 header note on versioning convention. Mirrors ADR-006 (Action
-- lifecycle) + Non-Negotiable #6 (auditable).

create table actions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  capability_id text not null,
  state text not null check (
    state in ('Draft', 'Development', 'Testing', 'Verified', 'Published',
              'Installed', 'Executed', 'Audited', 'Archived')
  ),
  state_history jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index idx_actions_tenant_id on actions(tenant_id);
alter table actions enable row level security;

create policy actions_tenant_isolation on actions
  for select using (
    tenant_id in (select tenant_id from profiles where profiles.id = auth.uid())
  );

create table audit_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  action_id uuid not null references actions(id),
  from_state text,
  to_state text not null,
  actor_id text not null,
  reasoning text,
  occurred_at timestamptz not null default now()
);

create index idx_audit_events_action_id on audit_events(action_id);
create index idx_audit_events_tenant_id on audit_events(tenant_id);
alter table audit_events enable row level security;

create policy audit_events_tenant_isolation on audit_events
  for select using (
    tenant_id in (select tenant_id from profiles where profiles.id = auth.uid())
  );

-- Append-only guarantee (Non-Negotiable #6): no update/delete policy is
-- defined for any role other than service_role (which bypasses RLS
-- entirely by design) — end users can only ever SELECT their own
-- tenant's audit events, never modify them.
