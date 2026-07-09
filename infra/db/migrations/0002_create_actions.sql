-- Backs the Action lifecycle state machine (ADR-006). state_history is
-- append-only from the application's perspective (services/audit-service
-- and policy-engine are the only writers) — enforced by convention here,
-- by DB grants once a dedicated migration+role separation is set up
-- (tracked, not yet done in Phase 1).

CREATE TABLE actions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  capability_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (
    state IN ('Draft', 'Development', 'Testing', 'Verified', 'Published',
              'Installed', 'Executed', 'Audited', 'Archived')
  ),
  state_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_actions_tenant_id ON actions(tenant_id);

ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY actions_isolation ON actions
  USING (tenant_id::text = current_setting('app.tenant_id', true));
