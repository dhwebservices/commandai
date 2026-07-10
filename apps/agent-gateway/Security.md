# Security

See packages/proto/Security.md for the full enrollment/mTLS design this
service is meant to implement. Current state, stated plainly:

- mTLS is enforced structurally (requireClientCert) but
  `verifyAgentCertificate` — the actual cert-to-agent-identity check — is
  NOT implemented. Every call is rejected, which is the safe failure mode
  given that gap; the alternative (accepting any cert) would not be.
- `AGENT_GATEWAY_ALLOW_INSECURE` bypasses TLS entirely for local dev. It
  logs a loud warning on startup. It must never be set in any environment
  a real device could reach.
- Before this can accept real agents: implement enrollment token exchange,
  cert issuance, cert-to-AgentCredential lookup in verifyAgentCertificate,
  and a rotation job — then this file needs a real review, not just a
  design doc, per RFC-001.
