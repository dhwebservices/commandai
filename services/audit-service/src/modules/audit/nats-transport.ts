import { connect, type NatsConnection, StringCodec } from "nats";
import type { AuditEvent } from "@comandr/schema";

/**
 * Implements the "every transition emits a NATS event" requirement from
 * ADR-006. Kept separate from recordTransition() (audit-log.ts) —
 * recording and publishing are different responsibilities, and a caller
 * that only needs the DB write (e.g. a backfill script) shouldn't be
 * forced to also publish.
 */
const SUBJECT_PREFIX = "commandai.action.transition";
const codec = StringCodec();

export async function connectNats(url: string): Promise<NatsConnection> {
  return connect({ servers: url });
}

export function subjectForTenant(tenantId: string): string {
  return `${SUBJECT_PREFIX}.${tenantId}`;
}

export async function publishTransition(nc: NatsConnection, event: AuditEvent): Promise<void> {
  nc.publish(subjectForTenant(event.tenantId), codec.encode(JSON.stringify(event)));
}

export function subscribeToTransitions(
  nc: NatsConnection,
  tenantId: string,
  onEvent: (event: AuditEvent) => void | Promise<void>,
): void {
  const sub = nc.subscribe(subjectForTenant(tenantId));
  (async () => {
    for await (const msg of sub) {
      const event = JSON.parse(codec.decode(msg.data)) as AuditEvent;
      await onEvent(event);
    }
  })();
}
