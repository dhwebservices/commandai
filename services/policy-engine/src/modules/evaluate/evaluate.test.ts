import { describe, it, expect } from "vitest";
import { evaluateIntent, assertAllowed } from "./evaluate";
import { PolicyDeniedError } from "@comandr/errors";
import type { Capability, Intent } from "@comandr/schema";

const readCapability: Capability = {
  id: "system.disk.read_usage",
  name: "Read Disk Usage",
  description: "Reports disk usage.",
  riskLevel: "read",
  requiresConfirmation: false,
  parameterSchema: {},
};

const destructiveCapability: Capability = {
  id: "system.file.delete",
  name: "Delete File",
  description: "Deletes a file.",
  riskLevel: "destructive",
  requiresConfirmation: true,
  parameterSchema: { path: "string" },
};

function makeIntent(capabilityId: string, reasoning = "User asked to check disk space."): Intent {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    tenantId: "11111111-1111-1111-1111-111111111111",
    capabilityId,
    parameters: {},
    reasoning,
    requestedBy: "user-123",
    createdAt: new Date().toISOString(),
  };
}

describe("evaluateIntent", () => {
  it("allows a read capability with reasoning present", () => {
    const decision = evaluateIntent(makeIntent(readCapability.id), readCapability);
    expect(decision.allowed).toBe(true);
    expect(decision.requiresConfirmation).toBe(false);
  });

  it("denies when reasoning is missing (Non-Negotiable: auditable by construction)", () => {
    const decision = evaluateIntent(makeIntent(readCapability.id, ""), readCapability);
    expect(decision.allowed).toBe(false);
  });

  it("requires confirmation for destructive capabilities (Non-Negotiable #7)", () => {
    const decision = evaluateIntent(
      makeIntent(destructiveCapability.id, "User asked to delete temp file."),
      destructiveCapability,
    );
    expect(decision.allowed).toBe(true);
    expect(decision.requiresConfirmation).toBe(true);
  });

  it("denies capabilities blocked by tenant policy", () => {
    const decision = evaluateIntent(
      makeIntent(readCapability.id),
      readCapability,
      { blockedCapabilityIds: [readCapability.id] },
    );
    expect(decision.allowed).toBe(false);
  });

  it("rejects mismatched intent/capability pairing", () => {
    expect(() =>
      evaluateIntent(makeIntent("some.other.capability"), readCapability),
    ).toThrow(PolicyDeniedError);
  });

  it("assertAllowed throws PolicyDeniedError on denial", () => {
    const intent = makeIntent(readCapability.id, "");
    const decision = evaluateIntent(intent, readCapability);
    expect(() => assertAllowed(decision, readCapability, intent)).toThrow(PolicyDeniedError);
  });
});
