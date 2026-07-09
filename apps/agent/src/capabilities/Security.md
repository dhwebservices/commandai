# Security

- `execute()` never accepts raw shell strings — parameters are structured
  JSON validated against the Capability's `parameterSchema` (defined in
  packages/schema, mirrored here) before this function is ever called.
- Workspace-level `#![deny(unsafe_code)]` (Cargo.toml `[lints.rust]`).
  Any future capability needing an unsafe block for OS syscalls requires
  an ADR justifying it (see docs/architecture/adr/ADR_TEMPLATE.md).
- Destructive capabilities must set `requires_confirmation() -> true` —
  the not-yet-built dispatcher will refuse to execute a destructive
  capability without a confirmation token, mirroring policy-engine's rule
  on the cloud side (Non-Negotiable #7).
