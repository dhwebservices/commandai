import { Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { Intent as IntentSchema, isValidTransition, type ActionRecord } from "@commandai/schema";
import { evaluateIntent, assertAllowed } from "@commandai/policy-engine";
import { CapabilityNotFoundError, ValidationError } from "@commandai/errors";
import { AuditLog, recordTransition } from "@commandai/audit-service";
import { findCapability } from "./capability-registry";

/**
 * Completes the path IntentsController.evaluate() pauses on: a destructive
 * capability is never executed on the initial request (Non-Negotiable #7)
 * — it requires this separate, explicit confirmation call. Re-evaluates
 * the Intent against policy-engine again here rather than trusting the
 * client's memory of the earlier decision, since tenant policy could have
 * changed between the pause and the confirmation.
 */
const ConfirmRequest = z.object({
  intent: IntentSchema,
  confirmedBy: z.string().min(1),
});

@Controller({ path: "intents", version: "1" })
export class ConfirmIntentController {
  private readonly auditLog = new AuditLog();

  @Post("confirm")
  async confirm(@Body() body: unknown) {
    const { intent, confirmedBy } = ConfirmRequest.parse(body);

    const capability = findCapability(intent.capabilityId);
    if (!capability) {
      throw new CapabilityNotFoundError(
        `No capability registered with id "${intent.capabilityId}".`,
      );
    }

    if (!capability.requiresConfirmation) {
      throw new ValidationError(
        `Capability "${capability.id}" does not require confirmation — use /v1/intents/evaluate instead.`,
      );
    }

    // Re-evaluate — do not trust the caller's memory of the earlier decision.
    const decision = evaluateIntent(intent, capability);
    assertAllowed(decision, capability, intent);

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

    await recordTransition(
      this.auditLog,
      action,
      "Executed",
      confirmedBy,
      `Confirmed destructive action: ${decision.reason}`,
    );
    const executedAction: ActionRecord = { ...action, state: "Executed" };
    await recordTransition(this.auditLog, executedAction, "Audited", "system", "auto-audited (Phase 1)");

    return {
      executed: true,
      confirmedBy,
      auditTrail: this.auditLog.forAction(intent.id),
    };
  }
}
