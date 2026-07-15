-- Platform admin RLS policies: platform_admin role can see and manage everything

-- Allow platform admins to see all tenants
CREATE POLICY tenants_platform_admin_select ON tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

-- Allow platform admins to update any tenant
CREATE POLICY tenants_platform_admin_update ON tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

-- Allow platform admins to see all profiles
CREATE POLICY profiles_platform_admin_select ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'platform_admin'
    )
  );

-- Allow platform admins to update any profile
CREATE POLICY profiles_platform_admin_update ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'platform_admin'
    )
  );

-- Allow platform admins to delete profiles (for user management)
CREATE POLICY profiles_platform_admin_delete ON profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'platform_admin'
    )
  );
