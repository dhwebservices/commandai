# ADR-010: agent-gateway service for the live AgentChannel gRPC connection
Status: Accepted (structural only — NOT cleared for production device connections)
Date: 2026-07-10

## Context
RFC-001 called for activating packages/proto's AgentChannel service
(ADR-007) as the second major Phase 2 item, alongside the LLM wiring
(ADR-004 follow-up, done). RFC-001 explicitly gates this: "needs a
security review pass (TLS, auth token scheme for agent<->cloud) before
going live, not after."

## Decision
- New service `apps/agent-gateway` (Node/TS) hosts the gRPC server,
  using `@grpc/proto-loader` to load `packages/proto/agent/v1/agent.proto`
  directly at runtime — no codegen step required (avoids a buf-remote-
  plugin dependency that would need network access to set up).
- Server requires mTLS (`requireClientCert`) by default; an insecure
  fallback exists ONLY behind an explicit `AGENT_GATEWAY_ALLOW_INSECURE=true`
  env flag, logged loudly on startup, intended for local dev only.
- Client-cert-to-agent-identity mapping (the actual enrollment/auth
  verification described in packages/proto/Security.md) is NOT
  implemented — `auth-interceptor.ts` explicitly throws
  "not yet implemented" rather than silently allowing any cert through.
  **This is the specific gap RFC-001's security review must close before
  any real device connects.**
- Rust agent gets a corresponding `cloud_client` module (tonic-based) that
  can dial the gateway, currently over an insecure channel with a `TODO`
  marking the mTLS requirement — matching the gateway's own current state
  honestly rather than pretending one side is more finished than the other.

## Alternatives Considered
Full codegen via buf remote plugins (as originally scaffolded in
packages/proto/buf.gen.yaml) — deferred: requires network access to
buf.build's remote plugin service, not available in the environment this
was built in. proto-loader achieves the same runtime behavior without it;
codegen can be added later as a build-time optimization, not a behavior
change.

## Migration strategy
N/A — greenfield, no live agents exist yet.

## Risks
- **This ADR does not clear agent-gateway for production use.** The
  missing auth-interceptor implementation is a hard block, not a nice-to-have
  — connecting a real device before it's built would mean any client
  certificate (or no cert, if the insecure flag is mis-set in a real
  environment) could impersonate an agent. Treat `AGENT_GATEWAY_ALLOW_INSECURE`
  as radioactive — it must never be set outside local dev.
- Follow-up RFC required before flipping this on for real: the actual
  enrollment token exchange, cert issuance, and rotation job described in
  packages/proto/Security.md are still entirely unbuilt.
