# Examples

```ts
import { evaluateIntent, assertAllowed } from "@commandai/policy-engine";

const decision = evaluateIntent(intent, capability, {
  blockedCapabilityIds: tenant.blockedCapabilityIds,
});

if (decision.requiresConfirmation) {
  // surface to user, pause execution until explicit confirm
}

assertAllowed(decision, capability, intent); // throws PolicyDeniedError if denied
// proceed to execute only after this line
```
