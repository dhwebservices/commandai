# API

gRPC only (AgentChannel service, packages/proto/agent/v1/agent.proto):
- `StreamIntents` (cloud -> agent): rejects every call, UNAUTHENTICATED
  (ADR-010 gap).
- `StreamStatus` (agent -> cloud): same.

No REST/HTTP surface. No working request currently succeeds end-to-end —
this is structural scaffolding pending the security review RFC-001 calls for.
