import type { PeerCertificate } from "node:tls";
import { createHash } from "node:crypto";
import { AgentAuthRepository } from "./agent-auth.repository";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "./config";

/**
 * Verify agent client certificate and return agent+tenant identity.
 * Per RFC-001, this is the trust boundary becoming network-reachable.
 *
 * SECURITY CRITICAL: This function is the gatekeeper for all agent<->cloud
 * communication. Any bypass or weakening of this check would allow arbitrary
 * clients to impersonate agents.
 */
export async function verifyAgentCertificate(cert: PeerCertificate): Promise<{
  agentId: string;
  tenantId: string;
}> {
  // Extract certificate fingerprint (SHA256 of DER-encoded cert)
  const fingerprint = getCertFingerprint(cert);

  // Verify against stored credentials via Supabase
  const supabase = createClient(
    getEnvVar("SUPABASE_URL"),
    getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
  );
  const repo = new AgentAuthRepository(supabase);

  try {
    const identity = await repo.verifyCredential(fingerprint);
    return identity;
  } catch (error) {
    // Log auth failures for security audit (but don't leak details to client)
    console.error("Agent certificate verification failed:", {
      fingerprint,
      subject: cert.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Agent authentication failed");
  }
}

/**
 * Extract SHA256 fingerprint from client certificate.
 * This is the stable identifier we use to look up AgentCredential.
 */
function getCertFingerprint(cert: PeerCertificate): string {
  // Node provides fingerprint256 in the format "AA:BB:CC:..."
  // Normalize to lowercase hex without colons for consistent storage
  if (cert.fingerprint256) {
    return cert.fingerprint256.replace(/:/g, "").toLowerCase();
  }

  // Fallback: compute SHA256 of DER-encoded cert if fingerprint256 not available
  // (shouldn't happen in modern Node, but defensive)
  if (cert.raw) {
    return createHash("sha256").update(cert.raw).digest("hex");
  }

  throw new Error("Cannot extract certificate fingerprint");
}
