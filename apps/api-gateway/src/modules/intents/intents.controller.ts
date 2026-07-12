import { Body, Controller, Inject, Post, Optional } from "@nestjs/common";
import type { NatsConnection } from "nats";
import { Intent as IntentSchema, isValidTransition, type ActionRecord } from "@comandr/schema";
import { evaluateIntent, assertAllowed } from "@comandr/policy-engine";
import { CapabilityNotFoundError } from "@comandr/errors";
import { recordTransition, publishTransition } from "@comandr/audit-service";
import { findCapability } from "./capability-registry";
import { AUDIT_LOG, type AuditLogPort } from "./audit-log.provider";
import { NATS_CONNECTION } from "./nats-connection.provider";

/**
 * End-to-end Phase 1 wiring: orchestrator drafts an Intent -> this endpoint
 * validates it against the schema -> policy-engine evaluates it (the sole
 * enforcement point, Non-Negotiable #2) -> on unconditional allow, a Phase-1
 * simulated execution is recorded through the Action lifecycle and audited.
 * No real agent dispatch yet — that requires packages/proto wiring, tracked
 * separately. Audit log is injected (AUDIT_LOG token) — Supabase-backed in
 * production (ADR-009), in-memory in tests, no code here cares which.
 */
@Controller({ path: "intents", version: "1" })
export class IntentsController {
  constructor(
    @Inject(AUDIT_LOG) private readonly auditLog: AuditLogPort,
    @Optional() @Inject(NATS_CONNECTION) private readonly nc: NatsConnection | null = null,
  ) {}

  /** Best-effort publish — a NATS outage must never fail the request (Architecture Principle #5). */
  private async publishBestEffort(event: Awaited<ReturnType<typeof recordTransition>>) {
    if (!this.nc) return;
    try {
      await publishTransition(this.nc, event);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Failed to publish transition event to NATS.", err);
    }
  }

  @Post("evaluate")
  async evaluate(@Body() body: unknown) {
    const intent = IntentSchema.parse(body);

    const capability = findCapability(intent.capabilityId);
    if (!capability) {
      throw new CapabilityNotFoundError(
        `No capability registered with id "${intent.capabilityId}".`,
      );
    }

    const decision = evaluateIntent(intent, capability);

    if (decision.requiresConfirmation) {
      // Destructive capability — execution paused, awaiting explicit user
      // confirmation (Non-Negotiable #7). Not simulated further in Phase 1.
      return { decision, executed: false };
    }

    assertAllowed(decision, capability, intent); // throws PolicyDeniedError on denial

    const action: ActionRecord = {
      id: intent.id,
      tenantId: intent.tenantId,
      capabilityId: capability.id,
      state: "Installed",
      stateHistory: [],
      createdAt: intent.createdAt,
    };

    if (!isValidTransition(action.state, "Executed")) {
      throw new CapabilityNotFoundError("Invalid lifecycle transition for this action.");
    }

    await this.auditLog.upsertAction?.(action);
    const executedEvent = await recordTransition(
      this.auditLog,
      action,
      "Executed",
      intent.requestedBy,
      decision.reason,
    );
    await this.publishBestEffort(executedEvent);

    const executedAction: ActionRecord = { ...action, state: "Executed" };
    const auditedEvent = await recordTransition(
      this.auditLog,
      executedAction,
      "Audited",
      "system",
      "auto-audited (Phase 1)",
    );
    await this.publishBestEffort(auditedEvent);

    return {
      decision,
      executed: true,
      auditTrail: await this.auditLog.forAction(intent.id),
    };
  }
}
