-- Server-managed command registry
-- Allows admins to define commands that sync to desktop agents
-- Commands are matched before AI fallback

-- Create trigger function for updating updated_at (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Command matching
  pattern TEXT NOT NULL, -- Primary pattern to match (e.g., "show cpu")
  aliases TEXT[], -- Alternative patterns (e.g., ["cpu usage", "processor"])
  description TEXT NOT NULL, -- Human-readable description

  -- Execution details
  capability_id TEXT NOT NULL, -- Which skill to execute (e.g., "system.cpu.usage")
  parameters JSONB DEFAULT '{}'::jsonb, -- Default parameters for the capability

  -- Organization/tenant scoping
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = global command
  is_active BOOLEAN NOT NULL DEFAULT true, -- Can be disabled without deleting

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id), -- Admin who created it

  -- Uniqueness: pattern must be unique within tenant (or globally if tenant_id is NULL)
  UNIQUE NULLS NOT DISTINCT (pattern, tenant_id)
);

-- Index for fast command matching
CREATE INDEX idx_commands_active ON commands(is_active) WHERE is_active = true;
CREATE INDEX idx_commands_tenant ON commands(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_commands_pattern ON commands(pattern);

-- RLS: Users can only see commands from their tenant or global commands
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's commands or global commands"
  ON commands FOR SELECT
  USING (
    tenant_id IS NULL OR -- Global commands
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) -- Tenant commands
  );

-- Only tenant owners can manage commands
CREATE POLICY "Tenant owners can manage commands"
  ON commands FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_commands_updated_at
  BEFORE UPDATE ON commands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some default global commands (available to all tenants)
INSERT INTO commands (pattern, aliases, description, capability_id, parameters, tenant_id, created_by) VALUES
  ('show cpu', ARRAY['cpu usage', 'processor'], 'Display CPU usage statistics', 'system.cpu.usage', '{}'::jsonb, NULL, NULL),
  ('show memory', ARRAY['memory usage', 'ram'], 'Display memory usage', 'system.memory.usage', '{}'::jsonb, NULL, NULL),
  ('show disk', ARRAY['disk usage', 'storage'], 'Display disk space usage', 'system.disk.usage', '{}'::jsonb, NULL, NULL),
  ('system info', ARRAY['computer info', 'sys info'], 'Show system information', 'system.info', '{}'::jsonb, NULL, NULL),
  ('list processes', ARRAY['show processes', 'ps'], 'List running processes', 'process.list', '{}'::jsonb, NULL, NULL),
  ('take screenshot', ARRAY['screenshot', 'capture screen'], 'Capture a screenshot', 'screenshot.capture', '{"path": "~/Desktop/screenshot.png"}'::jsonb, NULL, NULL);

COMMENT ON TABLE commands IS 'Server-managed command registry. Commands are synced to desktop agents and matched before AI fallback.';
COMMENT ON COLUMN commands.pattern IS 'Primary matching pattern. Must be unique within tenant scope.';
COMMENT ON COLUMN commands.aliases IS 'Alternative patterns that also match this command.';
COMMENT ON COLUMN commands.capability_id IS 'The registered skill/capability to execute.';
COMMENT ON COLUMN commands.tenant_id IS 'NULL for global commands, or specific tenant ID for org-specific commands.';
