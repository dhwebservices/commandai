# ADR-004: Python/FastAPI for the orchestration layer
Status: Accepted
Date: 2026-07-09

## Context
Orchestrator handles intent parsing, LLM calls, capability-plan generation.

## Decision
Python (FastAPI), isolated service, communicates only via packages/schema
and packages/proto contracts.

## Alternatives Considered
TypeScript — rejected: weaker ML/AI tooling ecosystem (eval frameworks,
embeddings, model provider SDKs).

## Consequences
Model/vendor changes isolated to this service only.
