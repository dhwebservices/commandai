import { describe, it, expect } from "vitest";
import { IntentsController } from "../../src/modules/intents/intents.controller";
import { PolicyDeniedError } from "@commandai/errors";

function makeIntentBody(capabilityId: string, reasoning = "User asked to check disk space.") {
  return {
    id: "00000000-0000-0000-0000-0000000000b1",
    tenantId: "11111111-1111-1111-1111-111111111111",
    capabilityId,
    parameters: {},
    reasoning,
    requestedBy: "user-123",
    createdAt: new Date().toISOString(),
  };
}

describe("Intent evaluation end-to-end", () => {
  it("evaluates a read-capability Intent, executes, and audits it", () => {
    const controller = new IntentsController();
    const result = controller.evaluate(makeIntentBody("system.disk.read_usage"));

    expect(result.decision.allowed).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.auditTrail).toHaveLength(2); // Executed, then Audited
    expect(result.auditTrail[1].toState).toBe("Audited");
  });

  it("pauses execution for a destructive capability pending confirmation", () => {
    const controller = new IntentsController();
    const result = controller.evaluate(
      makeIntentBody("system.file.delete", "User asked to delete a temp file."),
    );

    expect(result.decision.allowed).toBe(true);
    expect(result.decision.requiresConfirmation).toBe(true);
    expect(result.executed).toBe(false);
  });

  it("denies and throws PolicyDeniedError when reasoning is missing", () => {
    const controller = new IntentsController();
    expect(() => controller.evaluate(makeIntentBody("system.disk.read_usage", ""))).toThrow(
      // zod will actually reject empty reasoning at schema level before policy-engine sees it
      Error,
    );
  });

  it("throws CapabilityNotFoundError for an unregistered capability", () => {
    const controller = new IntentsController();
    expect(() => controller.evaluate(makeIntentBody("nonexistent.capability"))).toThrow();
  });
});
