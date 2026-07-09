import type { ActionRecord, ActionState, AuditEvent } from "@commandai/schema";
import { isValidTransition } from "@commandai/schema";
import { InternalError } from "@commandai/errors";

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
export function recordTransition(
  log: AuditLog,
  action: ActionRecord,
  toState: ActionState,
  actorId: string,
  reasoning?: string,
): AuditEvent {
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
export function findExecutedWithoutAudit(
  actions: ActionRecord[],
  log: AuditLog,
): ActionRecord[] {
  return actions.filter((action) => {
    if (action.state !== "Executed") return false;
    const events = log.forAction(action.id);
    return !events.some((e) => e.toState === "Audited");
  });
}
