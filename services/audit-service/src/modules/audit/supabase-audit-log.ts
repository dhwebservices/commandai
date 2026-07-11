import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRecord, AuditEvent } from "@commandai/schema";
import { InternalError } from "@commandai/errors";
import type { AuditWriter, AuditReader } from "./audit-log";

/**
 * Real persistence per ADR-009 — replaces PostgresAuditLog (raw pg against
 * local Postgres, now deprecated per packages/db/DEPRECATED.md) with the
 * same supabase-js pattern used throughout the rest of the app since the
 * data now lives in the Supabase project "command-ai". Implements the
 * same AuditWriter/AuditReader shape as the in-memory AuditLog, so
 * recordTransition/findExecutedWithoutAudit work unchanged.
 */
export class SupabaseAuditLog implements AuditWriter, AuditReader {
  constructor(private readonly supabase: SupabaseClient) {}

  async append(event: AuditEvent): Promise<AuditEvent> {
    const { error } = await this.supabase.from("audit_events").insert({
      id: event.id,
      tenant_id: event.tenantId,
      action_id: event.actionId,
      from_state: event.fromState ?? null,
      to_state: event.toState,
      actor_id: event.actorId,
      reasoning: event.reasoning ?? null,
      occurred_at: event.occurredAt,
    });
    if (error) throw new InternalError("Failed to append audit event.", { error });
    return event;
  }

  async forAction(actionId: string): Promise<AuditEvent[]> {
    const { data, error } = await this.supabase
      .from("audit_events")
      .select(
        'id, tenant_id AS "tenantId", action_id AS "actionId", from_state AS "fromState", to_state AS "toState", actor_id AS "actorId", reasoning, occurred_at AS "occurredAt"',
      )
      .eq("action_id", actionId)
      .order("occurred_at", { ascending: true });

    if (error) throw new InternalError("Failed to fetch audit trail.", { error });
    return (data ?? []) as unknown as AuditEvent[];
  }

  /** Upserts the actions row itself (state_history mirrors AuditEvent rows, queried separately). */
  async upsertAction(action: ActionRecord): Promise<void> {
    const { error } = await this.supabase.from("actions").upsert({
      id: action.id,
      tenant_id: action.tenantId,
      capability_id: action.capabilityId,
      state: action.state,
      created_at: action.createdAt,
    });
    if (error) throw new InternalError("Failed to upsert action.", { error });
  }
}
