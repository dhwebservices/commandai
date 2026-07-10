# Examples

Local dev only, never in a reachable environment:
```bash
AGENT_GATEWAY_ALLOW_INSECURE=true pnpm --filter @commandai/agent-gateway dev
```
Starts the server on an insecure channel — useful for testing the proto
wiring itself, not for anything resembling a real agent connection (every
call is still rejected by verifyAgentCertificate's gate).
