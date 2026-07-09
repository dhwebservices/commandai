import { z } from "zod";

/**
 * Scaffolds the agent<->cloud auth boundary per RFC-001 (highest-risk
 * item — the agent's first real network exposure). No live issuance/
 * verification wired yet; this defines the shape so the gRPC layer
 * (packages/proto) has a stable contract to authenticate against once
 * built. Real implementation requires a dedicated Security.md pass
 * before any device connects, per RFC-001.
 */
export const AgentEnrollmentToken = z.object({
  tokenId: z.string().uuid(),
  tenantId: z.string().uuid(),
  /** Short-lived, single-use. Exchanged for a long-lived AgentCredential on first connect. */
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type AgentEnrollmentToken = z.infer<typeof AgentEnrollmentToken>;

export const AgentCredential = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  /** Rotated periodically; agent re-authenticates via mTLS client cert, not a bearer token, once issued. */
  issuedAt: z.string().datetime(),
  rotatesAt: z.string().datetime(),
});
export type AgentCredential = z.infer<typeof AgentCredential>;
