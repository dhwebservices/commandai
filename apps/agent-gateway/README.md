# agent-gateway

Hosts the AgentChannel gRPC service (ADR-007, ADR-010) — the live
agent<->cloud connection RFC-001 called for. Trust-critical (this is the
network-exposed side of the agent trust boundary, ADR-002).

**NOT cleared for production device connections.** `auth-interceptor.ts`
deliberately throws on every call — real certificate-to-agent-identity
verification isn't built yet. See ADR-010 and packages/proto/Security.md
for what's still required before any real agent connects.

## Must never depend on
Anything that would let a call bypass verifyAgentCertificate. Never set
AGENT_GATEWAY_ALLOW_INSECURE=true outside local dev — see Security.md.
