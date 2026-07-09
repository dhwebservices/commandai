import { z } from "zod";

/**
 * Loads and validates config once at boot. Invalid config crashes on
 * startup with a clear error — never silently defaults in production.
 * See Non-Negotiable-adjacent principle in docs/standards/DESIGN_PRINCIPLES.md.
 */
export function loadConfig<S extends z.ZodTypeAny>(
  schema: S,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return result.data;
}

export const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(["local", "test", "staging", "production", "demo"]),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
export type BaseEnv = z.infer<typeof BaseEnvSchema>;

/**
 * ADR-009: Supabase is the real database + auth provider. Service role
 * key is powerful (bypasses RLS) — must only ever be loaded server-side
 * (api-gateway process), never shipped to web-console/browser code.
 */
export const SupabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
});
export type SupabaseEnv = z.infer<typeof SupabaseEnvSchema>;

/** ADR-009: Resend delivers all transactional auth email. */
export const ResendEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
});
export type ResendEnv = z.infer<typeof ResendEnvSchema>;
