# orchestrator

AI intent orchestration service (Python/FastAPI). Produces Intent objects
only — never executes anything, never calls policy-engine's enforcement
path directly. See ADR-004.

## Must never depend on
Direct DB access to tenant data (goes through tenant-service). Must not
import or shell out to execute Capabilities directly.

See API.md.

## LLM Provider (added, RFC-001)
`app/llm/provider.py` defines the provider-agnostic `LLMProvider`
interface. `app/llm/anthropic_provider.py` is the first concrete
implementation — fails fast without `ANTHROPIC_API_KEY`, real API call
not yet wired (needs tenant-scoped Capability catalog as tool
definitions first).

## Real LLM wiring (RFC-001, now live)
`AnthropicProvider.draft_intent_plan` makes a real `anthropic.messages.create`
call, using tool-calling with `capability_id` constrained to an enum of the
tenant's actual registered capabilities — the model cannot select or
invent anything outside that list. Two layers of defense: the tool
schema's enum, and an explicit re-check against the catalog after the
response (mirrors policy-engine's own capability-lookup pattern). Needs
`ANTHROPIC_API_KEY` set — fails fast without it.
