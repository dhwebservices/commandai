import { z } from "zod";

/**
 * An Intent is the only artifact the AI orchestration layer is permitted to
 * produce. It is never a shell command or arbitrary code — it is a
 * structured reference to a registered Capability plus typed parameters.
 * Validated against the Capability registry by policy-engine before any
 * execution occurs. See Non-Negotiable #2.
 */
export const Intent = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  capabilityId: z.string(),
  parameters: z.record(z.unknown()),
  reasoning: z.string(), // required for explainability — Non-Negotiable / audit principle
  requestedBy: z.string(),
  createdAt: z.string().datetime(),
});
export type Intent = z.infer<typeof Intent>;

export const CapabilityRiskLevel = z.enum(["read", "mutate", "destructive"]);
export type CapabilityRiskLevel = z.infer<typeof CapabilityRiskLevel>;

export const Capability = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  riskLevel: CapabilityRiskLevel,
  requiresConfirmation: z.boolean(), // true for all "destructive" per Non-Negotiable #7
  parameterSchema: z.record(z.unknown()),
});
export type Capability = z.infer<typeof Capability>;

export const AuditEvent = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  actionId: z.string().uuid(),
  fromState: z.string().optional(),
  toState: z.string(),
  actorId: z.string(),
  reasoning: z.string().optional(),
  occurredAt: z.string().datetime(),
});
export type AuditEvent = z.infer<typeof AuditEvent>;
