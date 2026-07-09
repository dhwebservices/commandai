# ADR-007: gRPC/protobuf for agent<->cloud protocol
Status: Accepted
Date: 2026-07-09

## Context
Cloud needs to push commands to agents; agents need to push status/telemetry.
Strong typing must be shared across Rust, TS, and Python.

## Decision
gRPC with protobuf, contracts defined in packages/proto, code generated for
all three languages.

## Alternatives Considered
REST/webhooks — rejected: no bidirectional streaming, would need a rewrite
once real-time device status is required.

## Consequences
Contract-test CI stage required to catch breaking proto changes before they
reach deployed agents (see .github/workflows/ci.yml).
