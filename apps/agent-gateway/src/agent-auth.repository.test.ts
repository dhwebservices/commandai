import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentAuthRepository } from "./agent-auth.repository";

describe("AgentAuthRepository", () => {
  function makeSupabaseMock(returnData: any, returnError: any = null) {
    const builder: any = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      lte: vi.fn(() => builder),
      order: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => ({ data: returnData, error: returnError })),
      single: vi.fn(async () => ({ data: returnData, error: returnError })),
    };
    return {
      from: vi.fn(() => builder),
    };
  }

  describe("generateEnrollmentToken", () => {
    it("generates a new enrollment token with secure random secret", async () => {
      const mockData = { token_id: "11111111-1111-1111-1111-111111111111" };
      const supabase = makeSupabaseMock(mockData) as any;
      const repo = new AgentAuthRepository(supabase);

      const result = await repo.generateEnrollmentToken(
        "22222222-2222-2222-2222-222222222222",
        3600_000,
      );

      expect(result.tokenId).toBe("11111111-1111-1111-1111-111111111111");
      expect(result.tokenSecret).toBeDefined();
      expect(result.tokenSecret.length).toBeGreaterThan(20);
      expect(supabase.from).toHaveBeenCalledWith("agent_enrollment_tokens");
    });
  });

  describe("verifyCredential", () => {
    it("returns agent identity for valid credential", async () => {
      const mockData = {
        agent_id: "33333333-3333-3333-3333-333333333333",
        tenant_id: "44444444-4444-4444-4444-444444444444",
        revoked: false,
        cert_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      };
      const supabase = makeSupabaseMock(mockData) as any;
      const repo = new AgentAuthRepository(supabase);

      const result = await repo.verifyCredential("abc123fingerprint");

      expect(result.agentId).toBe("33333333-3333-3333-3333-333333333333");
      expect(result.tenantId).toBe("44444444-4444-4444-4444-444444444444");
    });

    it("throws if credential is revoked", async () => {
      const mockData = {
        agent_id: "33333333-3333-3333-3333-333333333333",
        tenant_id: "44444444-4444-4444-4444-444444444444",
        revoked: true,
        cert_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      };
      const supabase = makeSupabaseMock(mockData) as any;
      const repo = new AgentAuthRepository(supabase);

      await expect(repo.verifyCredential("abc123fingerprint")).rejects.toThrow("revoked");
    });

    it("throws if credential not found", async () => {
      const supabase = makeSupabaseMock(null) as any;
      const repo = new AgentAuthRepository(supabase);

      await expect(repo.verifyCredential("notfound")).rejects.toThrow("not found");
    });
  });

  describe("revokeCredential", () => {
    it("marks credential as revoked with reason", async () => {
      const supabase = makeSupabaseMock({}) as any;
      const repo = new AgentAuthRepository(supabase);

      await repo.revokeCredential("33333333-3333-3333-3333-333333333333", "Agent decommissioned");

      expect(supabase.from).toHaveBeenCalledWith("agent_credentials");
    });
  });
});
