import { describe, it, expect } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns ok status with API version", () => {
    const controller = new HealthController();
    expect(controller.check()).toEqual({ status: "ok", service: "api-gateway", version: "v1" });
  });
});
