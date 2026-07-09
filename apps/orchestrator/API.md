# API

## GET /v1/health
## POST /v1/intents
Drafts a well-formed Intent (Phase 1 stub, no LLM call wired yet).
Request: `tenant_id, capability_id, parameters, reasoning, requested_by`.
`reasoning` is required (min length 1) — enforced by Pydantic, mirrors the
TS schema in packages/schema.
