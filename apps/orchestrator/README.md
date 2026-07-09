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
