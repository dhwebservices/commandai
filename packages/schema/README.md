# @commandai/schema

Canonical type definitions for Intent, Capability, ActionPlan, ActionRecord
(lifecycle), and AuditEvent. Source of truth — mirrored in Rust and Python.

Trust-critical module — full doc set required (see
docs/standards/MODULE_DOCS.md). Architecture.md / API.md / Testing.md /
Security.md / Examples.md to follow before other modules depend on
non-lifecycle additions.

## Must never depend on
Any app or service package. This package has zero dependencies on the rest
of the monorepo.
