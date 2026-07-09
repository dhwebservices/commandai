import { Body, Controller, Post } from "@nestjs/common";
import { Intent as IntentSchema, isValidTransition, type ActionRecord } from "@commandai/schema";
import { evaluateIntent, assertAllowed } from "@commandai/policy-engine";
import { CapabilityNotFoundError } from "@commandai/errors";
import { AuditLog, recordTransition } from "@commandai/audit-service";
import { findCapability } from "./capability-registry";

/**
 * End-to-end Phase 1 wiring: orchestrator drafts an Intent -> this endpoint
 * validates it against the schema -> policy-engine evaluates it (the sole
 * enforcement point, Non-Negotiable #2) -> on unconditional allow, a Phase-1
 * simulated execution is recorded through the Action lifecycle and audited.
 * No real agent dispatch yet — that requires packages/proto wiring, tracked
 * separately.
 */
@Controller({ path: "intents", version: "1" })
export class IntentsController {
  // Phase 1: process-local audit log. Phase 2: backed by Postgres, shared
  // across instances (see services/audit-service Architecture.md).
  private readonly auditLog = new AuditLog();

  @Post("evaluate")
  evaluate(@Body() body: unknown) {
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

    recordTransition(this.auditLog, action, "Executed", intent.requestedBy, decision.reason);
    const executedAction: ActionRecord = { ...action, state: "Executed" };
    recordTransition(this.auditLog, executedAction, "Audited", "system", "auto-audited (Phase 1)");

    return {
      decision,
      executed: true,
      auditTrail: this.auditLog.forAction(intent.id),
    };
  }
}
