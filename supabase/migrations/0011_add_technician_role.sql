-- Add technician role for business tenants
-- Technicians can initiate and manage remote support sessions

-- Update role constraint to include technician
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('platform_admin', 'owner', 'admin', 'technician', 'member', 'viewer'));

-- Add remote_permissions column to profiles (what remote actions they can perform)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS remote_permissions JSONB DEFAULT '{}';

COMMENT ON COLUMN profiles.remote_permissions IS 'Remote support capabilities granted to this user. Example: { "canInitiateSessions": true, "canViewSessions": true, "canRecordSessions": true, "canTransferFiles": true, "canExecuteCommands": true, "canAccessSupportQueue": true, "canBeAssignedRequests": true }';
