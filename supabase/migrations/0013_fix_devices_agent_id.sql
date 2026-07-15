-- Fix devices table agent_id to support TEXT identifiers
-- The original migration expected UUID foreign keys to agent_credentials,
-- but the current implementation uses simple TEXT identifiers like "mac-agent"

-- Drop the foreign key constraint and change agent_id to TEXT
ALTER TABLE devices DROP CONSTRAINT devices_agent_id_fkey;
ALTER TABLE devices ALTER COLUMN agent_id TYPE TEXT;

-- Update the index
DROP INDEX IF EXISTS idx_devices_agent_id;
CREATE UNIQUE INDEX idx_devices_agent_id ON devices(agent_id);

-- Add comment to clarify the design decision
COMMENT ON COLUMN devices.agent_id IS 'Agent identifier - currently TEXT for simple string IDs like "mac-agent", may be migrated to UUID when full mTLS enrollment is implemented';
