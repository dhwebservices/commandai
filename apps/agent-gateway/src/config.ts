import { z } from "zod";
import { BaseEnvSchema, loadConfig } from "@commandai/config";

export const AgentGatewayEnvSchema = BaseEnvSchema.extend({
  AGENT_GATEWAY_PORT: z.coerce.number().default(50051),
  // Paths to PEM files for mTLS. Required unless ALLOW_INSECURE is set.
  TLS_CERT_PATH: z.string().optional(),
  TLS_KEY_PATH: z.string().optional(),
  TLS_CA_CERT_PATH: z.string().optional(),
  /**
   * Radioactive flag (ADR-010) — must never be true outside local dev.
   * When true, the server accepts plaintext connections and
   * verifyAgentCertificate is never called at all, meaning NO identity
   * verification happens whatsoever. Loud warning logged on startup.
   */
  AGENT_GATEWAY_ALLOW_INSECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});
export type AgentGatewayEnv = z.infer<typeof AgentGatewayEnvSchema>;

export function loadAgentGatewayConfig(): AgentGatewayEnv {
  const config = loadConfig(AgentGatewayEnvSchema);

  if (!config.AGENT_GATEWAY_ALLOW_INSECURE) {
    if (!config.TLS_CERT_PATH || !config.TLS_KEY_PATH || !config.TLS_CA_CERT_PATH) {
      throw new Error(
        "TLS_CERT_PATH, TLS_KEY_PATH, and TLS_CA_CERT_PATH are required unless " +
          "AGENT_GATEWAY_ALLOW_INSECURE=true (local dev only — see ADR-010). " +
          "Failing fast rather than silently starting an unauthenticated gateway.",
      );
    }
  }

  return config;
}

/**
 * Get environment variable or throw if missing.
 * Used for Supabase config that's validated separately.
 */
export function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
