# Architecture

`evaluateIntent()` is the sole decision function. It takes an `Intent`, its
matching `Capability`, and optional `TenantPolicyOverrides`, and returns a
`PolicyDecision` — never executes anything itself.

Enforcement flow:
```
Intent produced by orchestrator
  -> policy-engine.evaluateIntent()
  -> assertAllowed() (throws PolicyDeniedError on denial)
  -> if requiresConfirmation: surfaced to user, execution paused
  -> only on explicit allow (+ confirmation if required): caller proceeds
  -> execution result + decision emitted as AuditEvent
```

Every code path that can mutate state must call through here. There is no
"trusted caller" bypass (Non-Negotiable #1, #2).

Future: tenant policy overrides will be loaded from tenant-service and
cached in Redis (see Phase 2 roadmap) — not yet wired in Phase 1.
