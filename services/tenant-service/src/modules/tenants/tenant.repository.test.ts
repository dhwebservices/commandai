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

describe("TenantRepository.updateBlockedCapabilities", () => {
  it("narrows the tenant's blocked capability list", async () => {
    const tenantsBuilder: any = {
      update: vi.fn(() => tenantsBuilder),
      eq: vi.fn(async () => ({ error: null })),
    };
    const supabase = { from: vi.fn(() => tenantsBuilder) };

    const repo = new TenantRepository(supabase as any);
    await expect(
      repo.updateBlockedCapabilities("tenant-1", ["system.file.delete"]),
    ).resolves.toBeUndefined();
    expect(tenantsBuilder.update).toHaveBeenCalledWith({
      blocked_capability_ids: ["system.file.delete"],
    });
  });

  it("throws InternalError if the update fails", async () => {
    const tenantsBuilder: any = {
      update: vi.fn(() => tenantsBuilder),
      eq: vi.fn(async () => ({ error: new Error("db error") })),
    };
    const supabase = { from: vi.fn(() => tenantsBuilder) };
    const repo = new TenantRepository(supabase as any);

    await expect(repo.updateBlockedCapabilities("tenant-1", [])).rejects.toThrow();
  });
});

describe("TenantRepository.addMember", () => {
  it("adds a member and re-checks the owner invariant", async () => {
    const supabase = makeSupabaseMock(
      {
        id: "33333333-3333-3333-3333-333333333333",
        name: "Acme",
        type: "business",
        parent_tenant_id: null,
        blocked_capability_ids: [],
        created_at: new Date().toISOString(),
      },
      [{ id: "44444444-4444-4444-4444-444444444444", role: "owner", created_at: new Date().toISOString() }],
    );
    const repo = new TenantRepository(supabase as any);

    await expect(repo.addMember("33333333-3333-3333-3333-333333333333", "55555555-5555-5555-5555-555555555555", "member")).resolves.toBeUndefined();
  });

  it("throws if the tenant does not exist", async () => {
    const supabase = makeSupabaseMock(null, []);
    const repo = new TenantRepository(supabase as any);

    await expect(repo.addMember("99999999-9999-9999-9999-999999999999", "55555555-5555-5555-5555-555555555555", "member")).rejects.toThrow();
  });
});
