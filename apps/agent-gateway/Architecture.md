# Architecture

Loads packages/proto/agent/v1/agent.proto at runtime via @grpc/proto-loader
(no codegen step — see ADR-010 for why). Implements AgentChannel's two
streaming RPCs (streamIntents, streamStatus); both immediately call
verifyAgentCertificate and reject with UNAUTHENTICATED since that function
is unimplemented by design (ADR-010).

Server requires mTLS (createSsl with requireClientCert=true) unless
AGENT_GATEWAY_ALLOW_INSECURE=true — config fails fast if TLS paths are
missing and the insecure flag isn't explicitly set (config.ts).
