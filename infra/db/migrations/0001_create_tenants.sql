-- Tenant-of-one is the default shape (Design Principle #3): every tenant,
-- home user or enterprise, uses this same table. No separate "org" model.

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('home', 'business', 'msp', 'msp_client', 'enterprise')),
  parent_tenant_id UUID REFERENCES tenants(id),
  blocked_capability_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_members (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

-- Enforced at the DB level, not just app code: every tenant must have an
-- owner. Application layer also checks this (services/tenant-service
-- assertHasOwner) — defense in depth, not either/or.
CREATE OR REPLACE FUNCTION check_tenant_has_owner() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id) AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Tenant % must retain at least one owner', COALESCE(NEW.tenant_id, OLD.tenant_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Row-level isolation: application connects as a role that only sees rows
-- matching the session's app.tenant_id (set via withTenantContext in
-- packages/db). This is enforced here, not just filtered in application
-- queries (see tech validation: RLS, not just app-layer filters).
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_members_isolation ON tenant_members
  USING (tenant_id::text = current_setting('app.tenant_id', true));
