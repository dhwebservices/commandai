import type { ActionRecord, ActionState, AuditEvent } from "@comandr/schema";
import { isValidTransition } from "@comandr/schema";
import { InternalError } from "@comandr/errors";

/**
 * Shape both AuditLog (in-memory) and PostgresAuditLog implement, so
 * recordTransition works against either without callers caring which.
 */
export interface AuditWriter {
  append(event: AuditEvent): AuditEvent | Promise<AuditEvent>;
  /** Optional: persists the Action row itself. No-op for backends (like in-memory) that don't track it separately. */
  upsertAction?(action: ActionRecord): void | Promise<void>;
}

export interface AuditReader {
  forAction(actionId: string, tenantId?: string): AuditEvent[] | Promise<AuditEvent[]>;
}

/**
 * In-memory append-only store. Phase 1 stub — Phase 2 backs this with
 * Postgres (append-only table, no UPDATE/DELETE grants at the DB role
 * level). See Non-Negotiable #6: every Action must be auditable.
 */
export class AuditLog {
  private readonly events: AuditEvent[] = [];

  append(event: AuditEvent): AuditEvent {
    this.events.push(event);
    return event;
  }

  all(): readonly AuditEvent[] {
    return this.events;
  }

  forAction(actionId: string): AuditEvent[] {
    return this.events.filter((e) => e.actionId === actionId);
  }
}

/**
 * Records a lifecycle transition. Throws if the transition itself is
 * invalid — audit-service does not silently log an impossible state
 * change, it refuses to (Non-Negotiable #6: auditable, not just logged).
 */
export async function recordTransition(
  log: AuditWriter,
  action: ActionRecord,
  toState: ActionState,
  actorId: string,
  reasoning?: string,
): Promise<AuditEvent> {
  if (!isValidTransition(action.state, toState)) {
    throw new InternalError(
      `Invalid transition from "${action.state}" to "${toState}" for action ${action.id}.`,
    );
  }

  return log.append({
    id: crypto.randomUUID(),
    tenantId: action.tenantId,
    actionId: action.id,
    fromState: action.state,
    toState,
    actorId,
    reasoning,
    occurredAt: new Date().toISOString(),
  });
}

/**
 * Detects the specific failure mode ADR-006 calls out: an Action executed
 * successfully but never reached Audited (e.g. disk full, network
 * partition during the audit write). Used by a monitoring job, not by the
 * request path itself.
 */
export async function findExecutedWithoutAudit(
  actions: ActionRecord[],
  log: AuditReader,
): Promise<ActionRecord[]> {
  const results: ActionRecord[] = [];
  for (const action of actions) {
    if (action.state !== "Executed") continue;
    const events = await log.forAction(action.id);
    if (!events.some((e) => e.toState === "Audited")) {
      results.push(action);
    }
  }
  return results;
}
