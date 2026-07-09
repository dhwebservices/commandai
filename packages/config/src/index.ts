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
