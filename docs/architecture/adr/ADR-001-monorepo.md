# ADR-001: Monorepo over polyrepo
Status: Accepted
Date: 2026-07-09

## Context
CommandAI has tightly coupled surfaces (intent schema, agent protocol) shared
across cloud and client. Multiple customer tiers share one architectural spine.

## Decision
Single monorepo using pnpm workspaces + Turborepo.

## Alternatives Considered
Polyrepo per service — rejected: would require constant cross-repo version
syncing for shared types at this stage.

## Consequences
Revisit split when a component has independent release cadence, its own
compliance boundary, or separate OSS lifecycle.
