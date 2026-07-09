# ADR-003: NestJS for the API layer
Status: Accepted
Date: 2026-07-09

## Context
Need a structured, testable service layer for multi-tenant API surface,
sharing types with web-console and packages/schema.

## Decision
NestJS (TypeScript) for api-gateway and TS services.

## Alternatives Considered
Go — rejected for Phase 1: less code-sharing with the TS frontend/schema
layer. Revisit for the agent-communication gateway specifically if agent
connection concurrency becomes the bottleneck.

## Consequences
Gateway component is extractable/rewritable independently if needed later.
