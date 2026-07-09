import { z } from "zod";

/**
 * A home user's account is a tenant with exactly one member. Multi-tenancy
 * is never a bolted-on special case — every tenant, regardless of tier,
 * uses this same shape. See docs/standards/DESIGN_PRINCIPLES.md #3.
 */
export const TenantType = z.enum(["home", "business", "msp", "msp_client", "enterprise"]);
export type TenantType = z.infer<typeof TenantType>;

export const MemberRole = z.enum(["owner", "admin", "member", "viewer"]);
export type MemberRole = z.infer<typeof MemberRole>;

export const TenantMember = z.object({
  userId: z.string().uuid(),
  role: MemberRole,
  joinedAt: z.string().datetime(),
});
export type TenantMember = z.infer<typeof TenantMember>;

export const Tenant = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: TenantType,
  /** MSPs manage client tenants via this pointer. Null for standalone tenants. */
  parentTenantId: z.string().uuid().nullable(),
  members: z.array(TenantMember).min(1), // every tenant has at least one owner
  blockedCapabilityIds: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});
export type Tenant = z.infer<typeof Tenant>;

export function isHomeTenant(tenant: Tenant): boolean {
  return tenant.type === "home" && tenant.members.length === 1;
}

export function assertHasOwner(tenant: Tenant): void {
  if (!tenant.members.some((m) => m.role === "owner")) {
    throw new Error(`Tenant ${tenant.id} has no owner — invalid state.`);
  }
}
