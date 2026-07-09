import { describe, it, expect } from "vitest";
import { StubBillingProvider } from "./index";

describe("StubBillingProvider", () => {
  it("returns an active free-tier subscription", async () => {
    const provider = new StubBillingProvider();
    const sub = await provider.getSubscription("tenant-1");
    expect(sub).toEqual({ tier: "free", active: true });
  });

  it("throws on checkout since billing is not implemented in Phase 1", async () => {
    const provider = new StubBillingProvider();
    await expect(provider.createCheckoutSession("tenant-1", "business")).rejects.toThrow();
  });
});
