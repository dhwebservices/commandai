# RFC-001: Phase 2 Kickoff — Live Intent Pipeline
Status: Accepted
Author: CTO (Claude)
Date: 2026-07-09

## Why is this needed?
Phase 1 built the enforcement/audit spine (policy-engine, tenant-service,
audit-service) and proved the Intent lifecycle end-to-end with simulated
execution. Phase 2's first real milestone is making that pipeline live:
real LLM-backed intent drafting, a real agent<->cloud connection, and real
async messaging. Three of these are RFC-trigger items per
docs/architecture/RFC_PROCESS.md (new messaging system, new external
dependency via LLM provider, activating the agent protocol) — this RFC
covers all three together since they're delivered as one connected
milestone, not because bundling is the default going forward.

## Decisions requiring sign-off

### 1. Messaging: NATS vs Kafka (carries over ADR-005, still unconfirmed)
- **NATS**: lower operational overhead, sufficient for Phase 2 volume.
- **Kafka**: durability/replay built in, better fit if audit-event volume
  at MSP/enterprise scale demands replay — but real overhead for a small
  team right now.
- Recommendation: proceed with NATS (ADR-005), revisit via a new RFC when
  we have real usage data on audit-event volume.

### 2. LLM provider for orchestrator intent-drafting
- Not yet decided. Options: Anthropic API, OpenAI API, or a
  provider-agnostic adapter behind an interface in packages/schema (so
  switching providers later doesn't touch orchestrator call sites).
- Recommendation: build the adapter interface regardless of which
  provider is chosen first — this is cheap now and expensive to retrofit
  once prompt-specific logic accumulates.

### 3. Activating packages/proto (real gRPC agent<->cloud connection)
- Currently: contract defined (ADR-007), no live connection. Phase 2 needs
  the agent to actually stream status and receive Intents.
- Risk: this is the agent's first real network exposure — needs a
  security review pass (TLS, auth token scheme for agent<->cloud) before
  going live, not after.

## Alternatives considered
Sequencing these as three separate RFCs — rejected for this kickoff only:
they're delivered as one connected milestone and reviewing them together
surfaces the interactions between the messaging choice and the agent
protocol's delivery guarantees.

## Migration strategy
No existing production data/users yet — this is greenfield activation, not
a migration. Sequencing: (1) confirm NATS, (2) build LLM adapter interface
+ pick first provider, (3) stand up agent<->cloud TLS + auth, (4) wire
live Intent flow end-to-end, (5) security review before any real device
connects.

## Risks
- Agent<->cloud auth scheme is the single highest-risk item in Phase 2 —
  it's the actual trust boundary (ADR-002) becoming network-reachable for
  the first time. Recommend this gets a dedicated Security.md pass before
  any code ships, not folded into general review.
- LLM provider choice has cost/rate-limit implications at scale that are
  hard to estimate without real usage data — recommend starting with
  usage caps per tenant tier from day one rather than adding them later
  under pressure.

## Decision
Accepted 2026-07-09. Founder approved all recommendations as written:
1. NATS confirmed (ADR-005 updated to Accepted).
2. LLM provider adapter interface built first; Anthropic API as first
   concrete provider (packages/schema-defined contract, orchestrator
   depends only on the interface).
3. Agent<->cloud gRPC activation proceeds per the sequencing above, with
   a dedicated Security.md pass on the auth/TLS scheme before any real
   device connects — token-based auth scaffolded now, real device
   enrollment flow is follow-up work, not blocking this RFC.
