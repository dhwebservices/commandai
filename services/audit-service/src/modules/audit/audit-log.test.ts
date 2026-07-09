import { describe, it, expect } from "vitest";
import { AuditLog, recordTransition, findExecutedWithoutAudit } from "./audit-log";
import type { ActionRecord } from "@commandai/schema";

function makeAction(state: ActionRecord["state"] = "Installed"): ActionRecord {
  return {
    id: "00000000-0000-0000-0000-0000000000a1",
    tenantId: "11111111-1111-1111-1111-111111111111",
    capabilityId: "system.disk.read_usage",
    state,
    stateHistory: [],
    createdAt: new Date().toISOString(),
  };
}

describe("recordTransition", () => {
  it("records a valid transition", () => {
    const log = new AuditLog();
    const action = makeAction("Installed");
    const event = recordTransition(log, action, "Executed", "agent-1", "scheduled run");
    expect(event.toState).toBe("Executed");
    expect(log.forAction(action.id)).toHaveLength(1);
  });

  it("refuses to log an invalid transition", () => {
    const log = new AuditLog();
    const action = makeAction("Draft");
    expect(() => recordTransition(log, action, "Published", "user-1")).toThrow();
  });
});

describe("findExecutedWithoutAudit", () => {
  it("flags an Executed action with no Audited event (ADR-006 gap detection)", () => {
    const log = new AuditLog();
    const action = makeAction("Executed");
    const gaps = findExecutedWithoutAudit([action], log);
    expect(gaps).toHaveLength(1);
  });

  it("does not flag an action once Audited is recorded", () => {
    const log = new AuditLog();
    const action = makeAction("Executed");
    recordTransition(log, action, "Audited", "system");
    const gaps = findExecutedWithoutAudit([action], log);
    expect(gaps).toHaveLength(0);
  });
});
