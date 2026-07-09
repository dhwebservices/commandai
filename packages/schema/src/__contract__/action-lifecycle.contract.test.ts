import { describe, it, expect } from "vitest";
import { isValidTransition } from "../action-lifecycle";

describe("Action lifecycle contract", () => {
  it("does not allow skipping states", () => {
    expect(isValidTransition("Draft", "Published")).toBe(false);
  });

  it("allows the canonical forward path", () => {
    expect(isValidTransition("Draft", "Development")).toBe(true);
    expect(isValidTransition("Executed", "Audited")).toBe(true);
  });

  it("Archived is terminal", () => {
    expect(isValidTransition("Archived", "Draft")).toBe(false);
  });
});
