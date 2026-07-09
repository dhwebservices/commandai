# capabilities/

Trust-critical module (see docs/standards/MODULE_DOCS.md). Every capability
the agent can perform lives here, one file per domain, implementing the
`Capability` trait in `mod.rs`. `CapabilityRegistry` (src/registry.rs) is
the only lookup path — nothing else may construct or invoke a capability.

See Architecture.md, API.md, Testing.md, Security.md, Examples.md.
