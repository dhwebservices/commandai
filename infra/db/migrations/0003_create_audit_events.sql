-- Immutable audit stream (Non-Negotiable #6). This table is never updated
-- or deleted from — the audit_service application role (created here) is
-- granted INSERT and SELECT only, never UPDATE or DELETE, so this is
-- enforced at the database level, not just by application discipline.

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  action_id UUID NOT NULL REFERENCES actions(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  reasoning TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_action_id ON audit_events(action_id);
CREATE INDEX idx_audit_events_tenant_id ON audit_events(tenant_id);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_isolation ON audit_events
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Dedicated role: application connects as this role in production, never
-- as a superuser/owner role. Local dev uses the default 'commandai' role
-- for simplicity (see infra/docker/docker-compose.dev.yml); this
-- restrictive role is what Phase 2 deployment will actually use.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'audit_service_role') THEN
    CREATE ROLE audit_service_role NOLOGIN;
  END IF;
END
$$;

GRANT INSERT, SELECT ON audit_events TO audit_service_role;
REVOKE UPDATE, DELETE ON audit_events FROM audit_service_role;
