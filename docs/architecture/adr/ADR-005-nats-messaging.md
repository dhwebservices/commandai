# ADR-005: NATS over Kafka for messaging
Status: Proposed — pending founder confirmation
Date: 2026-07-09

## Context
Need agent<->cloud and internal service messaging.

## Decision
NATS for Phase 1.

## Alternatives Considered
Kafka — rejected for now: durability/replay requirements not yet present;
Kafka's operational overhead is high for a small team.

## Consequences
Migration path to Kafka possible later if audit/event-replay volume demands
it. Messaging abstracted behind an interface in packages/schema to make the
swap non-invasive.
