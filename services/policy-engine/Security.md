# Security

- This module is the sole enforcement point for capability execution.
  Any new call path into execution (agent, api-gateway, plugin runtime) must
  route through `evaluateIntent` + `assertAllowed` — no exceptions, no
  "internal/trusted" bypass flag.
- Missing `reasoning` on an Intent is treated as a denial, not a soft
  warning — this is what keeps audit trails complete (Non-Negotiable #6).
- Destructive capabilities always require confirmation
  (`requiresConfirmation: true`) regardless of caller — this cannot be
  overridden by tenant policy in the current design; if a future need
  arises to make this configurable, that requires an RFC (changes to the
  Capability schema are an RFC-trigger, see docs/architecture/RFC_PROCESS.md).
- Tenant policy overrides (`blockedCapabilityIds`) are additive-restrictive
  only — they can narrow what's allowed, never widen it beyond the
  Capability's own risk level.
