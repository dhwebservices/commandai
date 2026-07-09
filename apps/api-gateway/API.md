# API

## GET /v1/health
Returns `{ status: "ok", service: "api-gateway", version: "v1" }`.

All future endpoints follow the `/v1/*` prefix pattern (URI versioning,
Non-Negotiable #4). Breaking changes to any published endpoint require a
deprecation window (Non-Negotiable #9) and, if the change affects the
public contract broadly, an RFC.

## POST /v1/intents/evaluate
End-to-end Phase 1 wiring: validates an Intent (packages/schema) ->
evaluates it via policy-engine (sole enforcement point) -> on unconditional
allow, records a simulated Installed -> Executed -> Audited transition
through audit-service.

Request body: full `Intent` shape (`id, tenantId, capabilityId, parameters,
reasoning, requestedBy, createdAt`).

Responses:
- `{ decision, executed: false }` — destructive capability, awaiting
  confirmation (not yet built: confirmation endpoint).
- `{ decision, executed: true, auditTrail }` — executed and audited.
- `403 POLICY_DENIED` — denied (e.g. missing reasoning, blocked capability).
- `404 CAPABILITY_NOT_FOUND` — unregistered capability id.

No real agent dispatch yet — execution is simulated pending
packages/proto gRPC wiring.
