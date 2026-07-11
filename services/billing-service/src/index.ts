/**
 * Interface scaffold only — subscription billing is out of scope for
 * Phase 1 (see original engineering charter, section on commercial
 * vision: Phase 2+). Defining the shape now so tenant-service and
 * api-gateway can code against a stable contract without waiting on a
 * real billing provider integration decision (Stripe vs. alternatives —
 * that choice is an RFC when we get there, given it's a new external
 * dependency affecting the auth/tenant model).
 */

export type PlanTier = "free" | "home" | "business" | "msp" | "enterprise";

export interface BillingProvider {
  getSubscription(tenantId: string): Promise<{ tier: PlanTier; active: boolean }>;
  createCheckoutSession(tenantId: string, tier: PlanTier): Promise<{ url: string }>;
}

/** Phase 1 stub implementation — always returns a free-tier, active subscription. */
export class StubBillingProvider implements BillingProvider {
  async getSubscription(_tenantId: string) {
    return { tier: "free" as PlanTier, active: true };
  }

  async createCheckoutSession(_tenantId: string, _tier: PlanTier): Promise<{ url: string }> {
    throw new Error("Billing not implemented in Phase 1.");
  }
}
