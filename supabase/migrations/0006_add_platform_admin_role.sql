-- Add platform_admin role for super admins with access to all features across all account types
-- This role bypasses tenant type restrictions and has access to Personal, Business, and Enterprise features

-- Drop the existing check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new constraint with platform_admin role
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('platform_admin', 'owner', 'admin', 'member', 'viewer'));

-- Update existing owners to platform_admin if needed (optional - uncomment to auto-upgrade)
-- UPDATE profiles SET role = 'platform_admin' WHERE role = 'owner' AND id = (SELECT id FROM profiles LIMIT 1);
