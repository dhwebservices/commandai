# Architecture

`Capability` trait: `id()`, `risk_level()`, `requires_confirmation()`,
`execute(parameters: &Value)`. One file per capability domain (e.g.
`system_disk.rs`) — deliberately explicit, not dynamically loaded, so every
capability is greppable and independently reviewable (per the original
Phase 1 charter's folder-structure rationale).

`CapabilityRegistry` is the sole construction/lookup point. The not-yet-built
Intent dispatcher will call `registry.find(intent.capability_id)` and
nothing else — there is no code path that runs a string as a command.
