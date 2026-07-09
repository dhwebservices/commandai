# Design Principles (Tie-Breakers)

When a decision isn't clear-cut, default in this order:

1. Simple over clever
2. Readability over shorter code
3. Stability over new features
4. Modular over tightly coupled
5. Explicit over magic

## Architecture Principles

1. Capability isolation — LLM/orchestrator never emits executable commands,
   only structured `Intent` objects validated against the `Capability` registry.
2. Policy before execution — every mutating action passes through
   `policy-engine`, no exceptions.
3. Tenant-of-one is the default shape — home user = tenant with one member.
4. Explicit contracts between languages — only via `packages/schema` and
   `packages/proto`.
5. Degrade, don't fail, when offline.
6. No silent failures.
7. Everything is auditable by construction.
