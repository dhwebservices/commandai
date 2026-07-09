import type { Pool } from "pg";
import type { AuditEvent } from "@commandai/schema";
import { withTenantContext } from "@commandai/db";

/**
 * Postgres-backed implementation, additive alongside the in-memory
 * AuditLog (audit-log.ts) — same append/forAction shape so callers can
 * swap implementations without changing call sites. Writes go through
 * withTenantContext so RLS (infra/db/migrations/0003_create_audit_events.sql)
 * applies. No update/delete methods exposed here either — mirrors the
 * DB-level grant restriction (Non-Negotiable #6, ADR-006).
 */
export class PostgresAuditLog {
  constructor(private readonly pool: Pool) {}

  async append(event: AuditEvent): Promise<AuditEvent> {
    await withTenantContext(this.pool, event.tenantId, async (client) => {
      await client.query(
        `INSERT INTO audit_events (id, tenant_id, action_id, from_state, to_state, actor_id, reasoning, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          event.id,
          event.tenantId,
          event.actionId,
          event.fromState ?? null,
          event.toState,
          event.actorId,
          event.reasoning ?? null,
          event.occurredAt,
        ],
      );
    });
    return event;
  }

  async forAction(actionId: string, tenantId?: string): Promise<AuditEvent[]> {
    if (!tenantId) {
      throw new Error("PostgresAuditLog.forAction requires tenantId for RLS-scoped reads.");
    }
    return withTenantContext(this.pool, tenantId, async (client) => {
      const result = await client.query(
        `SELECT id, tenant_id AS "tenantId", action_id AS "actionId", from_state AS "fromState",
                to_state AS "toState", actor_id AS "actorId", reasoning, occurred_at AS "occurredAt"
         FROM audit_events WHERE action_id = $1 ORDER BY occurred_at ASC`,
        [actionId],
      );
      return result.rows as AuditEvent[];
    });
  }
}
