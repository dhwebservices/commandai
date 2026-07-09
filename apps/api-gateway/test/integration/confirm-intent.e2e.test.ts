import { describe, it, expect } from "vitest";
import { ConfirmIntentController } from "../../src/modules/intents/confirm-intent.controller";

function makeConfirmBody(capabilityId: string, confirmedBy = "user-123") {
  return {
    intent: {
      id: "00000000-0000-0000-0000-0000000000c1",
      tenantId: "11111111-1111-1111-1111-111111111111",
      capabilityId,
      parameters: { path: "/tmp/example.txt" },
      reasoning: "User asked to delete a temp file.",
      requestedBy: "user-123",
      createdAt: new Date().toISOString(),
    },
    confirmedBy,
  };
}

describe("Confirmation endpoint", () => {
  it("executes and audits a destructive capability once confirmed", async () => {
    const controller = new ConfirmIntentController();
    const result = await controller.confirm(makeConfirmBody("system.file.delete"));

    expect(result.executed).toBe(true);
    expect(result.confirmedBy).toBe("user-123");
    expect(result.auditTrail).toHaveLength(2);
    expect(result.auditTrail[0].reasoning).toContain("Confirmed destructive action");
  });

  it("rejects confirmation for a capability that never required it", async () => {
    const controller = new ConfirmIntentController();
    await expect(controller.confirm(makeConfirmBody("system.disk.read_usage"))).rejects.toThrow();
  });

  it("requires confirmedBy to be present", async () => {
    const controller = new ConfirmIntentController();
    const body = makeConfirmBody("system.file.delete", "");
    await expect(controller.confirm(body)).rejects.toThrow();
  });
});
