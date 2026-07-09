# ADR-006: Action Lifecycle State Machine
Status: Accepted
Date: 2026-07-09

## Context
The Action lifecycle is the core state machine underpinning marketplace,
plugins, MSP tooling, and audit.

## Decision
States: Draft -> Development -> Testing -> Verified -> Published ->
Installed -> Executed -> Audited -> Archived.

Defined in packages/schema/action-lifecycle.ts (mirrored in Rust/Python).
Every Action carries a state field, immutable state history, and valid
transitions enforced by policy-engine. Executed and Audited are separate
states. Archived is soft-delete only, full history queryable indefinitely.
Every transition emits a NATS event consumed by audit-service.

## Alternatives Considered
Merging Executed/Audited into one state — rejected: would hide audit-write
failures (disk full, network partition) as a distinct, detectable failure mode.

## Consequences
Retention policy for Archived Actions at scale to be revisited via RFC once
real usage data exists.
