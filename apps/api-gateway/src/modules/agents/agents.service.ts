import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnvVar } from "@commandai/config";
import { randomBytes, createHash } from "node:crypto";

/**
 * Service for agent enrollment token management.
 * Delegates to Supabase for persistence (agent_enrollment_tokens table).
 */
@Injectable()
export class AgentsService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      getEnvVar("SUPABASE_URL"),
      getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
    );
  }

  async generateEnrollmentToken(
    tenantId: string,
    expiresInMs: number,
  ): Promise<{ tokenId: string; tokenSecret: string; expiresAt: string }> {
    // Generate cryptographically secure random token
    const tokenSecret = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(tokenSecret).digest("hex");

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
      .select("token_id, expires_at")
      .single();

    if (error) throw new Error(`Failed to generate enrollment token: ${error.message}`);

    return {
      tokenId: data.token_id,
      tokenSecret, // Return plaintext ONCE — show to admin, never stored
      expiresAt: data.expires_at,
    };
  }
}
