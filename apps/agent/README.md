# agent

Cross-platform device agent core (Rust). Trust boundary of the product
(ADR-002). `capabilities/*` is the trust-critical module within this app —
full doc set required there specifically (see docs/standards/MODULE_DOCS.md).

## Must never depend on
Any dynamic/reflective dispatch that could run something outside the
CapabilityRegistry. `#![deny(unsafe_code)]` at the workspace level;
exceptions require an ADR.
