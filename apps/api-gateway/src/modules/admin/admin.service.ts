import type { SupabaseClient } from "@supabase/supabase-js";

export class AdminService {
  constructor(private readonly supabase: SupabaseClient) {}

  async verifyPlatformAdmin(token: string): Promise<boolean> {
    const { data: { user }, error } = await this.supabase.auth.getUser(token);

    if (error || !user) {
      return false;
    }

    const { data: profile } = await this.supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return profile?.role === "platform_admin";
  }

  async listAllUsers() {
    const { data: profiles, error } = await this.supabase
      .from("profiles")
      .select(`
        id,
        username,
        contact_email,
        role,
        email_verified,
        created_at,
        tenant_id,
        tenants (
          id,
          name,
          type
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch users");
    }

    return {
      users: profiles.map((profile: any) => ({
        id: profile.id,
        username: profile.username,
        email: profile.contact_email,
        role: profile.role,
        emailVerified: profile.email_verified,
        createdAt: profile.created_at,
        tenant: profile.tenants ? {
          id: profile.tenants.id,
          name: profile.tenants.name,
          type: profile.tenants.type,
        } : null,
      })),
      total: profiles.length,
    };
  }

  async listAllOrganizations() {
    const { data: tenants, error } = await this.supabase
      .from("tenants")
      .select(`
        id,
        name,
        type,
        parent_tenant_id,
        blocked_capability_ids,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch organizations");
    }

    // Count users per tenant
    const { data: profiles } = await this.supabase
      .from("profiles")
      .select("tenant_id");

    const userCounts = new Map<string, number>();
    profiles?.forEach((profile: any) => {
      userCounts.set(profile.tenant_id, (userCounts.get(profile.tenant_id) || 0) + 1);
    });

    return {
      organizations: tenants.map((tenant: any) => ({
        id: tenant.id,
        name: tenant.name,
        type: tenant.type,
        parentTenantId: tenant.parent_tenant_id,
        blockedCapabilities: tenant.blocked_capability_ids || [],
        userCount: userCounts?.get(tenant.id) || 0,
        createdAt: tenant.created_at,
      })),
      total: tenants.length,
    };
  }

  async createUser(userData: { username: string; password: string; email: string; role?: string; tenantId?: string }) {
    // Create auth user
    const { data: authUser, error: authError } = await this.supabase.auth.admin.createUser({
      email: `${userData.username}@login.commandai.internal`,
      password: userData.password,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      throw new Error("Failed to create auth user: " + authError?.message);
    }

    // Create or get tenant
    let tenantId = userData.tenantId;
    if (!tenantId) {
      const { data: tenant, error: tenantError } = await this.supabase
        .from("tenants")
        .insert({ name: `${userData.username}'s Home`, type: "home" })
        .select()
        .single();

      if (tenantError || !tenant) {
        throw new Error("Failed to create tenant");
      }
      tenantId = tenant.id;
    }

    // Create profile
    const { data: profile, error: profileError } = await this.supabase
      .from("profiles")
      .insert({
        id: authUser.user.id,
        username: userData.username,
        contact_email: userData.email,
        tenant_id: tenantId,
        role: userData.role || "member",
        email_verified: true,
      })
      .select()
      .single();

    if (profileError) {
      throw new Error("Failed to create profile: " + profileError.message);
    }

    return { success: true, user: profile };
  }

  async updateUser(userId: string, userData: { username?: string; email?: string; role?: string; tenantId?: string; emailVerified?: boolean }) {
    const updateData: any = {};

    if (userData.username) updateData.username = userData.username;
    if (userData.email) updateData.contact_email = userData.email;
    if (userData.role) updateData.role = userData.role;
    if (userData.tenantId) updateData.tenant_id = userData.tenantId;
    if (userData.emailVerified !== undefined) updateData.email_verified = userData.emailVerified;

    const { data, error } = await this.supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw new Error("Failed to update user: " + error.message);
    }

    return { success: true, user: data };
  }

  async deleteUser(userId: string) {
    // Delete auth user first to prevent login access immediately
    // If this fails, nothing has been modified yet
    const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);

    if (authError) {
      throw new Error("Failed to delete auth user: " + authError.message);
    }

    // Then delete profile (this will cascade to other tables)
    // User can no longer log in even if this fails
    const { error: profileError } = await this.supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      throw new Error("Failed to delete profile: " + profileError.message);
    }

    return { success: true };
  }

  async updateOrganization(orgId: string, orgData: { name?: string; type?: string; blockedCapabilities?: string[] }) {
    const updateData: any = {};

    if (orgData.name) updateData.name = orgData.name;
    if (orgData.type) updateData.type = orgData.type;
    if (orgData.blockedCapabilities) updateData.blocked_capability_ids = orgData.blockedCapabilities;

    const { data, error } = await this.supabase
      .from("tenants")
      .update(updateData)
      .eq("id", orgId)
      .select()
      .single();

    if (error) {
      throw new Error("Failed to update organization: " + error.message);
    }

    return { success: true, organization: data };
  }

  async deleteOrganization(orgId: string) {
    // Check if there are users in this organization
    const { count } = await this.supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", orgId);

    if (count && count > 0) {
      throw new Error("Cannot delete organization with existing users. Please reassign or delete users first.");
    }

    const { error } = await this.supabase
      .from("tenants")
      .delete()
      .eq("id", orgId);

    if (error) {
      throw new Error("Failed to delete organization: " + error.message);
    }

    return { success: true };
  }

  async resetUserPassword(userId: string, newPassword: string) {
    // Update user password using Supabase admin API
    const { error } = await this.supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new Error("Failed to reset password: " + error.message);
    }

    return { success: true, message: "Password updated successfully" };
  }

  async getPlatformStats() {
    // Get total users
    const { count: totalUsers } = await this.supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Get total organizations
    const { count: totalOrgs } = await this.supabase
      .from("tenants")
      .select("*", { count: "exact", head: true });

    // Get counts by tenant type
    const { data: tenantTypes } = await this.supabase
      .from("tenants")
      .select("type");

    const typeCounts = {
      home: 0,
      business: 0,
      enterprise: 0,
      msp: 0,
      msp_client: 0,
    };

    tenantTypes?.forEach((t: any) => {
      if (t.type in typeCounts) {
        typeCounts[t.type as keyof typeof typeCounts]++;
      }
    });

    // Get role distribution
    const { data: roles } = await this.supabase
      .from("profiles")
      .select("role");

    const roleCounts = {
      platform_admin: 0,
      owner: 0,
      admin: 0,
      member: 0,
      viewer: 0,
    };

    roles?.forEach((r: any) => {
      if (r.role in roleCounts) {
        roleCounts[r.role as keyof typeof roleCounts]++;
      }
    });

    return {
      totalUsers: totalUsers || 0,
      totalOrganizations: totalOrgs || 0,
      accountTypes: typeCounts,
      roleDistribution: roleCounts,
    };
  }
}
