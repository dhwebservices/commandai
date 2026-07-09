import type { Capability, Intent } from "@commandai/schema";
import { PolicyDeniedError } from "@commandai/errors";

export interface PolicyDecision {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
}

export interface TenantPolicyOverrides {
  /** Capability IDs explicitly blocked for this tenant, regardless of default risk level. */
  blockedCapabilityIds: string[];
}

/**
 * Evaluates an Intent against its Capability before any execution.
 * This is the single enforcement point — every caller (agent, api-gateway,
 * MSP console) must go through this. See Non-Negotiable #2 (never execute
 * AI-generated output without validation) and #7 (destructive requires
 * confirmation).
 */
export function evaluateIntent(
  intent: Intent,
  capability: Capability,
  overrides: TenantPolicyOverrides = { blockedCapabilityIds: [] },
): PolicyDecision {
  if (intent.capabilityId !== capability.id) {
    throw new PolicyDeniedError(
      "Intent references a capability that does not match the provided capability record.",
      "capability-mismatch",
      intent.capabilityId,
      { intentId: intent.id },
    );
  }

  if (overrides.blockedCapabilityIds.includes(capability.id)) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `Capability "${capability.id}" is blocked by tenant policy.`,
    };
  }

  if (!intent.reasoning || intent.reasoning.trim().length === 0) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "Intent is missing required reasoning — cannot be audited without it.",
    };
  }

  if (capability.riskLevel === "destructive" && capability.requiresConfirmation) {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: `Capability "${capability.id}" is destructive and requires explicit user confirmation before execution.`,
    };
  }

  return {
    allowed: true,
    requiresConfirmation: false,
    reason: `Capability "${capability.id}" permitted at risk level "${capability.riskLevel}".`,
  };
}

/** Throws PolicyDeniedError if the decision disallows execution. Callers use this at the enforcement boundary. */
export function assertAllowed(decision: PolicyDecision, capability: Capability, intent: Intent): void {
  if (!decision.allowed) {
    throw new PolicyDeniedError(decision.reason, "default-policy", capability.id, {
      intentId: intent.id,
    });
  }
}
