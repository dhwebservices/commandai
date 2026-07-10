# API

## GET /v1/health

## POST /v1/intents
Manual construction — caller already knows the capability_id (e.g. a UI
button). No LLM call. Demonstrates the Intent shape.

## POST /v1/intents/draft-from-request (RFC-001 — real LLM wiring)
Real Anthropic-backed drafting. Request: `tenant_id, user_request,
requested_by`. Turns natural language into a structured Intent via
tool-calling constrained to the registered capability catalog (Phase 1:
static registry in app/intents/capability_registry.py, not yet
tenant-scoped). Returns the drafted Intent — NOT executed; it still must
pass through policy-engine's evaluateIntent (api-gateway
/v1/intents/evaluate) before anything happens.

`422` if the model's proposed capability_id isn't in the catalog (defense
in depth — the tool schema's enum should already prevent this) or if the
catalog is empty.
