# api-gateway

Public/tenant-facing API (NestJS). Phase 1: health check only, versioned
(/v1), wired to fail-fast config loading via @commandai/config.

## Must never depend on
Agent-internal Rust code directly. Talks to orchestrator/policy-engine only
via packages/schema-defined contracts.

See API.md. Architecture.md/Testing.md/Security.md/Examples.md to follow
before other modules depend on this one (non-trust-critical tier, see
docs/standards/MODULE_DOCS.md).
