import type { PeerCertificate } from "node:tls";

/**
 * THIS IS THE GAP RFC-001's SECURITY REVIEW MUST CLOSE (ADR-010).
 *
 * Real implementation must: extract the client cert's identity, look up
 * the corresponding AgentCredential (packages/schema/agent-auth.ts),
 * verify it hasn't been revoked/expired, and return the agent+tenant
 * identity for the call. Until that exists, this throws rather than
 * silently trusting any presented certificate — an unimplemented check
 * that fails open would be far worse than one that fails loud.
 */
export function verifyAgentCertificate(_cert: PeerCertificate): {
  agentId: string;
  tenantId: string;
} {
  throw new Error(
    "Agent certificate verification is not yet implemented (ADR-010 / RFC-001). " +
      "No agent may connect to this gateway in a real environment until this is built " +
      "and security-reviewed. See packages/proto/Security.md.",
  );
}
