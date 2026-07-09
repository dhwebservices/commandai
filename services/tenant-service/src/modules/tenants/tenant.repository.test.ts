import { describe, it, expect, vi } from "vitest";
import { TenantRepository } from "./tenant.repository";

function makeSupabaseMock(tenantRow: unknown, profileRows: unknown[]) {
  const tenantsBuilder: any = {
    select: vi.fn(() => tenantsBuilder),
    eq: vi.fn(() => tenantsBuilder),
    maybeSingle: vi.fn(async () => ({ data: tenantRow, error: null })),
    update: vi.fn(() => tenantsBuilder),
  };
  const profilesBuilder: any = {
    select: vi.fn(() => profilesBuilder),
    eq: vi.fn(async () => ({ data: profileRows, error: null })),
    update: vi.fn(() => profilesBuilder),
  };

  return {
    from: vi.fn((table: string) => (table === "tenants" ? tenantsBuilder : profilesBuilder)),
  };
}

describe("TenantRepository.findById", () => {
  it("returns a tenant with members derived from profiles", async () => {
    const supabase = makeSupabaseMock(
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Alice's Home",
        type: "home",
        parent_tenant_id: null,
        blocked_capability_ids: [],
        created_at: new Date().toISOString(),
      },
      [{ id: "22222222-2222-2222-2222-222222222222", role: "owner", created_at: new Date().toISOString() }],
    );

    const repo = new TenantRepository(supabase as any);
    const tenant = await repo.findById("11111111-1111-1111-1111-111111111111");

    expect(tenant).not.toBeNull();
    expect(tenant?.members).toHaveLength(1);
    expect(tenant?.members[0].role).toBe("owner");
  });

  it("returns null for a nonexistent tenant", async () => {
    const supabase = makeSupabaseMock(null, []);
    const repo = new TenantRepository(supabase as any);
    const tenant = await repo.findById("nonexistent-id");
    expect(tenant).toBeNull();
  });
});
