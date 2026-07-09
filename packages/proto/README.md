# @commandai/proto

Agent<->cloud gRPC contracts (ADR-007). Source of truth for generated
Rust/TS/Python stubs. `buf breaking` runs in CI contract-tests — breaking
changes here require an RFC (docs/architecture/RFC_PROCESS.md).

## Must never depend on
Any app or service package.
