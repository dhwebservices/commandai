import { describe, it, expect } from "vitest";
import { Tenant, isHomeTenant, assertHasOwner } from "./tenant.model";

function makeTenant(overrides: Partial<Parameters<typeof Tenant.parse>[0]> = {}) {
  return Tenant.parse({
    id: "11111111-1111-1111-1111-111111111111",
    name: "Home User - Alice",
    type: "home",
    parentTenantId: null,
    members: [
      { userId: "22222222-2222-2222-2222-222222222222", role: "owner", joinedAt: new Date().toISOString() },
    ],
    blockedCapabilityIds: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  });
}

describe("Tenant model", () => {
  it("home tenant is the degenerate single-member case, not a special path", () => {
    const tenant = makeTenant();
    expect(isHomeTenant(tenant)).toBe(true);
  });

  it("MSP client tenant carries a parentTenantId", () => {
    const tenant = makeTenant({
      type: "msp_client",
      parentTenantId: "33333333-3333-3333-3333-333333333333",
    });
    expect(tenant.parentTenantId).not.toBeNull();
    expect(isHomeTenant(tenant)).toBe(false);
  });

  it("rejects a tenant with zero members at schema level", () => {
    expect(() => makeTenant({ members: [] })).toThrow();
  });

  it("assertHasOwner throws if no owner present", () => {
    const tenant = makeTenant({
      members: [
        { userId: "44444444-4444-4444-4444-444444444444", role: "member", joinedAt: new Date().toISOString() },
      ],
    });
    expect(() => assertHasOwner(tenant)).toThrow();
  });
});
