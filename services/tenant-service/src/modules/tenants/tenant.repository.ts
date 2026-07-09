import type { SupabaseClient } from "@supabase/supabase-js";
import { Tenant, assertHasOwner, type TenantMember } from "./tenant.model";
import { InternalError } from "@commandai/errors";

/**
 * Rewritten per ADR-009: Supabase is the real database. Tenant creation
 * itself lives in apps/api-gateway/src/modules/auth/auth.service.ts
 * (signup creates the tenant + first owner profile together in one
 * transaction-like sequence) — this repository does NOT duplicate that
 * with its own `create()`. This is read/management only: fetching a
 * tenant with its members, and updating tenant-level policy state.
 *
 * "Members" are derived from `profiles` rows (`tenant_id` FK) — there is
 * no separate tenant_members table in the Supabase schema (see the
 * Supabase migration `create_tenants_and_profiles`); one profile row per
 * user already carries tenant_id + role.
 */
export class TenantRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(tenantId: string): Promise<Tenant | null> {
    const { data: tenantRow, error: tenantError } = await this.supabase
      .from("tenants")
      .select("id, name, type, parent_tenant_id, blocked_capability_ids, created_at")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantError) throw new InternalError("Failed to fetch tenant.", { tenantError });
    if (!tenantRow) return null;

    const { data: profileRows, error: profileError } = await this.supabase
      .from("profiles")
      .select("id, role, created_at")
      .eq("tenant_id", tenantId);

    if (profileError) throw new InternalError("Failed to fetch tenant members.", { profileError });

    const members: TenantMember[] = (profileRows ?? []).map((p) => ({
      userId: p.id,
      role: p.role,
      joinedAt: p.created_at,
    }));

    return Tenant.parse({
      id: tenantRow.id,
      name: tenantRow.name,
      type: tenantRow.type,
      parentTenantId: tenantRow.parent_tenant_id,
      blockedCapabilityIds: tenantRow.blocked_capability_ids ?? [],
      members,
      createdAt: tenantRow.created_at,
    });
  }

  /**
   * Tenant-policy update — narrows what's allowed only, mirrors
   * services/policy-engine's additive-restrictive-only rule for tenant
   * overrides (see policy-engine/Security.md).
   */
  async updateBlockedCapabilities(tenantId: string, blockedCapabilityIds: string[]): Promise<void> {
    const { error } = await this.supabase
      .from("tenants")
      .update({ blocked_capability_ids: blockedCapabilityIds })
      .eq("id", tenantId);

    if (error) throw new InternalError("Failed to update tenant capability policy.", { error });
  }

  /** Adds an existing authenticated user to a tenant (Phase 2 invite flow entry point). */
  async addMember(tenantId: string, profileId: string, role: TenantMember["role"]): Promise<void> {
    const tenant = await this.findById(tenantId);
    if (!tenant) throw new InternalError(`Tenant ${tenantId} not found.`);

    const { error } = await this.supabase
      .from("profiles")
      .update({ tenant_id: tenantId, role })
      .eq("id", profileId);

    if (error) throw new InternalError("Failed to add tenant member.", { error });

    const updated = await this.findById(tenantId);
    if (updated) assertHasOwner(updated); // re-check invariant after the membership change
  }
}
