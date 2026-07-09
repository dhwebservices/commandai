import pino from "pino";

/**
 * Shared log shape: timestamp, service, level, tenant_id, trace_id, message,
 * context. `audit` is a distinct stream from operational logs — never
 * rotated/deleted on the same policy. See docs/standards logging section.
 */
export interface LogContext {
  tenantId?: string;
  traceId?: string;
  [key: string]: unknown;
}

const REDACT_KEYS = ["password", "token", "apiKey", "secret", "ssn"];

export function createLogger(service: string, level: string = "info") {
  return pino({
    level,
    base: { service },
    redact: REDACT_KEYS.map((k) => `*.${k}`),
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;

export function withContext(logger: Logger, ctx: LogContext) {
  return logger.child(ctx);
}
