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

## POST /v1/intents/confirm
Completes the pause from `/v1/intents/evaluate` when
`decision.requiresConfirmation` was true (Non-Negotiable #7). Re-evaluates
the Intent against policy-engine again rather than trusting the client's
memory of the earlier decision, since tenant policy could have changed in
between.

Request body: `{ intent: Intent, confirmedBy: string }`.

Responses:
- `{ executed: true, confirmedBy, auditTrail }` — executed and audited.
- `400 VALIDATION_ERROR` — capability never required confirmation, or
  `confirmedBy` missing.
- `403 POLICY_DENIED` — denied on re-evaluation.

## Auth (ADR-009, see modules/auth/AUTH_DESIGN.md for full flow)

### POST /v1/auth/signup
`{ username, contactEmail, password }` -> creates a home tenant (owner),
a Supabase Auth user (synthetic email internally), a profile, and sends a
verification email via Resend. Returns `{ userId, tenantId }`.

### POST /v1/auth/login
`{ username, password }` -> `{ accessToken, refreshToken, userId }`.
Generic `400 VALIDATION_ERROR` ("Invalid username or password.") for any
failure — no signal on which part was wrong.

### POST /v1/auth/verify-email
`{ token }` -> `{ verified: true }`. 400 if token invalid/expired/consumed.

### POST /v1/auth/request-password-reset
`{ username }` -> always `{ requested: true }` regardless of whether the
username exists (enumeration protection). Sends a reset email only if it does.

### POST /v1/auth/reset-password
`{ token, newPassword }` -> `{ reset: true }`. 400 if token
invalid/expired/consumed.
