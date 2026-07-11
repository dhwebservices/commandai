import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";
import type { AgentEnrollmentToken, AgentCredential } from "@commandai/schema";

/**
 * Repository for agent enrollment tokens and credentials.
 * Per RFC-001, this is the trust boundary (ADR-002) becoming network-reachable.
 */
export class AgentAuthRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Generate a new enrollment token for a tenant admin to provision an agent.
   * Returns the plaintext token (show once to admin) and stores the hash.
   */
  async generateEnrollmentToken(
    tenantId: string,
    expiresInMs: number = 3600_000, // 1 hour default
  ): Promise<{ tokenId: string; tokenSecret: string }> {
    // Generate cryptographically secure random token
    const tokenSecret = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(tokenSecret);

    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();
    const createdAt = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("agent_enrollment_tokens")
      .insert({
        tenant_id: tenantId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: createdAt,
      })
      .select("token_id")
      .single();

    if (error) throw new Error(`Failed to generate enrollment token: ${error.message}`);

    return {
      tokenId: data.token_id,
      tokenSecret, // Return plaintext ONCE — never stored, never retrievable
    };
  }

  /**
   * Verify and consume an enrollment token. Returns the token data if valid,
   * throws if invalid/expired/already-used.
   */
  async consumeEnrollmentToken(tokenId: string, tokenSecret: string): Promise<AgentEnrollmentToken> {
    const tokenHash = hashToken(tokenSecret);

    const { data, error } = await this.supabase
      .from("agent_enrollment_tokens")
      .select("*")
      .eq("token_id", tokenId)
      .eq("token_hash", tokenHash)
      .eq("used", false)
      .maybeSingle();

    if (error) throw new Error(`Failed to verify enrollment token: ${error.message}`);
    if (!data) throw new Error("Invalid or expired enrollment token");

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      throw new Error("Enrollment token has expired");
    }

    // Mark as used (single-use, no reuse allowed)
    const { error: updateError } = await this.supabase
      .from("agent_enrollment_tokens")
      .update({ used: true })
      .eq("token_id", tokenId);

    if (updateError) throw new Error(`Failed to mark token as used: ${updateError.message}`);

    return {
      tokenId: data.token_id,
      tenantId: data.tenant_id,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  }

  /**
   * Issue a new agent credential tied to a client certificate.
   * Called after successful enrollment token exchange.
   */
  async issueCredential(
    tenantId: string,
    certFingerprint: string,
    certSubject: string,
    certExpiresAt: Date,
    rotationDays: number = 30,
  ): Promise<AgentCredential> {
    const issuedAt = new Date().toISOString();
    const rotatesAt = new Date(Date.now() + rotationDays * 86_400_000).toISOString();

    const { data, error } = await this.supabase
      .from("agent_credentials")
      .insert({
        tenant_id: tenantId,
        cert_fingerprint: certFingerprint,
        cert_subject: certSubject,
        cert_expires_at: certExpiresAt.toISOString(),
        issued_at: issuedAt,
        rotates_at: rotatesAt,
      })
      .select("agent_id, tenant_id, issued_at, rotates_at")
      .single();

    if (error) throw new Error(`Failed to issue agent credential: ${error.message}`);

    return {
      agentId: data.agent_id,
      tenantId: data.tenant_id,
      issuedAt: data.issued_at,
      rotatesAt: data.rotates_at,
    };
  }

  /**
   * Verify a client certificate against stored credentials.
   * Returns the agent+tenant identity if valid, throws if revoked/expired/not-found.
   */
  async verifyCredential(certFingerprint: string): Promise<{ agentId: string; tenantId: string }> {
    const { data, error } = await this.supabase
      .from("agent_credentials")
      .select("agent_id, tenant_id, revoked, cert_expires_at")
      .eq("cert_fingerprint", certFingerprint)
      .maybeSingle();

    if (error) throw new Error(`Failed to verify credential: ${error.message}`);
    if (!data) throw new Error("Agent credential not found");

    if (data.revoked) {
      throw new Error("Agent credential has been revoked");
    }

    if (new Date(data.cert_expires_at) < new Date()) {
      throw new Error("Agent certificate has expired");
    }

    return {
      agentId: data.agent_id,
      tenantId: data.tenant_id,
    };
  }

  /**
   * Revoke an agent credential (agent removed, compromised cert, etc.)
   */
  async revokeCredential(agentId: string, reason: string): Promise<void> {
    const { error } = await this.supabase
      .from("agent_credentials")
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq("agent_id", agentId);

    if (error) throw new Error(`Failed to revoke credential: ${error.message}`);
  }

  /**
   * Find credentials due for rotation (rotatesAt < now + bufferDays).
   * Used by rotation job to proactively issue new certs before expiry.
   */
  async findCredentialsDueForRotation(bufferDays: number = 7): Promise<AgentCredential[]> {
    const rotationDeadline = new Date(Date.now() + bufferDays * 86_400_000).toISOString();

    const { data, error } = await this.supabase
      .from("agent_credentials")
      .select("agent_id, tenant_id, issued_at, rotates_at")
      .lte("rotates_at", rotationDeadline)
      .eq("revoked", false)
      .order("rotates_at", { ascending: true });

    if (error) throw new Error(`Failed to find credentials for rotation: ${error.message}`);

    return (data ?? []).map((row) => ({
      agentId: row.agent_id,
      tenantId: row.tenant_id,
      issuedAt: row.issued_at,
      rotatesAt: row.rotates_at,
    }));
  }
}

/** Hash enrollment token for storage (bcrypt would be better, but crypto.createHash is sufficient for short-lived tokens) */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
