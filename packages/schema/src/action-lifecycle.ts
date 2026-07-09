import { z } from "zod";

/**
 * Action lifecycle — see ADR-006.
 * Executed and Audited are distinct states: an Action can be executed
 * successfully while its audit write fails, and that gap must be detectable.
 */
export const ActionState = z.enum([
  "Draft",
  "Development",
  "Testing",
  "Verified",
  "Published",
  "Installed",
  "Executed",
  "Audited",
  "Archived",
]);
export type ActionState = z.infer<typeof ActionState>;

// Valid forward transitions. No transition may skip a state.
export const VALID_TRANSITIONS: Record<ActionState, ActionState[]> = {
  Draft: ["Development"],
  Development: ["Testing"],
  Testing: ["Verified", "Development"], // failed verification sends back to Development
  Verified: ["Published"],
  Published: ["Installed"],
  Installed: ["Executed"],
  Executed: ["Audited"],
  Audited: ["Archived"],
  Archived: [], // terminal, soft-delete only — history remains queryable
};

export function isValidTransition(from: ActionState, to: ActionState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export const ActionStateHistoryEntry = z.object({
  state: ActionState,
  occurredAt: z.string().datetime(),
  actorId: z.string(),
  reason: z.string().optional(),
});
export type ActionStateHistoryEntry = z.infer<typeof ActionStateHistoryEntry>;

export const ActionRecord = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  capabilityId: z.string(),
  state: ActionState,
  stateHistory: z.array(ActionStateHistoryEntry),
  createdAt: z.string().datetime(),
});
export type ActionRecord = z.infer<typeof ActionRecord>;
