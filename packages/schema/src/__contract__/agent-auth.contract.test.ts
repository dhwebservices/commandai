import { describe, it, expect } from "vitest";
import { AgentEnrollmentToken, AgentCredential } from "../agent-auth";

describe("agent auth schema", () => {
  it("validates a well-formed enrollment token", () => {
    const token = AgentEnrollmentToken.parse({
      tokenId: "00000000-0000-0000-0000-000000000001",
      tenantId: "11111111-1111-1111-1111-111111111111",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    expect(token.tenantId).toBeDefined();
  });

  it("validates a well-formed agent credential", () => {
    const cred = AgentCredential.parse({
      agentId: "00000000-0000-0000-0000-000000000002",
      tenantId: "11111111-1111-1111-1111-111111111111",
      issuedAt: new Date().toISOString(),
      rotatesAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(cred.agentId).toBeDefined();
  });
});
