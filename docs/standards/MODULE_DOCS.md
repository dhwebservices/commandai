# Module Documentation Standard

## Trust-critical modules
`policy-engine`, `packages/schema`, agent `capabilities/*`, `tenant-service`, auth,
`agent-gateway` (added ADR-010 — network-exposed side of the agent trust boundary).

Required from first commit:
- README.md
- Architecture.md
- API.md
- Testing.md
- Security.md
- Examples.md

## All other modules
Required at creation:
- README.md
- API.md

Remaining four required before any other module may depend on it.
