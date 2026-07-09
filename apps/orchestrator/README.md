# orchestrator

AI intent orchestration service (Python/FastAPI). Produces Intent objects
only — never executes anything, never calls policy-engine's enforcement
path directly. See ADR-004.

## Must never depend on
Direct DB access to tenant data (goes through tenant-service). Must not
import or shell out to execute Capabilities directly.

See API.md.
