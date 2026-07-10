import type { NatsConnection } from "nats";
import { connectNats } from "@commandai/audit-service";
import { loadApiGatewayConfig } from "../../config";

export const NATS_CONNECTION = "NATS_CONNECTION";

/**
 * Best-effort connection. NATS carries the ADR-006 "every transition
 * emits an event" requirement, but it is a real-time notification
 * channel, not the audit-of-record (that's the Supabase/in-memory
 * AuditLog write, which already succeeded by the time we'd publish).
 * A NATS outage must never fail or block the request — Architecture
 * Principle #5 (degrade, don't fail). Returns null if unreachable; call
 * sites treat null as "publishing unavailable this instance" and skip it.
 */
export async function natsConnectionFactory(): Promise<NatsConnection | null> {
  try {
    const config = loadApiGatewayConfig();
    return await connectNats(config.NATS_URL);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("NATS unavailable — transition events will not be published this instance.", err);
    return null;
  }
}
