# Security

This is the agent's first real network exposure (ADR-002: the agent is
the trust boundary of the product). Per RFC-001, this gets a dedicated
pass rather than being folded into general review.

## Transport
mTLS required for every agent<->cloud connection — not optional, not
downgradable. Cloud terminates TLS at the gRPC gateway; client certs are
issued per-agent (see packages/schema `AgentCredential`), never shared
across agents or tenants.

## Enrollment
1. Tenant admin generates a short-lived, single-use `AgentEnrollmentToken`
   (packages/schema) out-of-band (web-console action).
2. New agent presents the token on first connect, exchanges it for a
   long-lived `AgentCredential` + client certificate.
3. Enrollment token is invalidated immediately after exchange — no reuse,
   no long-lived shared secrets.

## Ongoing auth
Agent authenticates via mTLS client cert on every connection, not a bearer
token after initial enrollment. Certs rotate on a schedule (`rotatesAt` on
`AgentCredential`) — rotation failure should degrade to "agent offline",
never to falling back to a weaker auth method.

## Not yet implemented
Actual token issuance/verification, cert rotation job, and the gRPC
gateway's auth interceptor are Phase 2 follow-up work — this document
defines the required shape; RFC-001 blocks any live device connection
until this is built and reviewed, not just designed.
