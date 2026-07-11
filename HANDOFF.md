# CommandAI — handoff to Claude Code

Repo: https://github.com/dhwebservices/commandai (public, main branch, up to date)
Local copy: ~/Downloads/commandai (already cloned, remote configured, in sync with GitHub as of commit 5d236f1)

## What this is
AI operating system management platform. Full engineering charter in
docs/standards/ (non-negotiables, design principles, coding standards),
architecture decisions in docs/architecture/adr/ (ADR-001 through
ADR-010), RFC-001 in docs/architecture/rfcs/.

## Current state (commit 5d236f1)
- Monorepo: pnpm workspaces + Turborepo, apps/services/packages structure
- Auth: real, working — Supabase (project "command-ai", ref
  xnmmwqrezspgjspdllzb) for DB + Auth, Resend for transactional email.
  Username/password login with synthetic-email-under-the-hood design —
  see apps/api-gateway/src/modules/auth/AUTH_DESIGN.md
- web-console: login/signup/verify-email/reset-password UI (React), plus
  a Tauri desktop wrapper (apps/web-console/src-tauri/) — NOT YET BUILT
  or run locally, that's the next real step
- api-gateway (NestJS): auth endpoints + intents evaluate/confirm flow
  (policy-engine -> audit -> Supabase), all wired and unit-tested
- orchestrator (Python/FastAPI): real Anthropic API wiring for
  intent-drafting via tool-calling, constrained to a capability catalog
- agent-gateway (new, ADR-010): gRPC AgentChannel service — structurally
  built but DELIBERATELY NOT production-cleared. auth-interceptor.ts
  throws on every call by design (no real device should connect yet) —
  this is the biggest open engineering item
- agent (Rust): capability registry pattern, one example capability
  (system.disk.read_usage), not yet connected to agent-gateway

## What's never been actually run
Nothing has been through `pnpm install` or a real build/test cycle yet —
all prior work happened in a network-restricted sandbox (claude.ai's code
execution environment) that couldn't reach npm or GitHub directly. This
is genuinely fresh ground for verifying it all actually compiles and
passes tests.

## Immediate priorities, roughly in order
1. `pnpm install` at the repo root — first real installation, expect to
   find and fix whatever doesn't actually work
2. Get CI green on GitHub Actions (.github/workflows/ci.yml) — last known
   issue was a pnpm version conflict, believed fixed in commit f7227ee,
   unverified since
3. `.env.local` needs real values: SUPABASE_SERVICE_ROLE_KEY (from
   Supabase dashboard, never committed), RESEND_API_KEY (already
   generated, sending-only, scoped to dhwebsiteservices.co.uk — ask David
   for it), see .env.example for the full list
4. Build the Tauri desktop app for real — apps/web-console/DESKTOP_BUILD.md
   has the exact steps, untested end-to-end
5. The real open engineering gap: agent-gateway's auth-interceptor
   (apps/agent-gateway/src/auth-interceptor.ts) needs actual
   certificate-to-agent-identity verification before any real device can
   connect — see ADR-010 and packages/proto/Security.md for the intended
   design

## Working style established so far
- CTO/principal-architect framing: push back on weak decisions, write
  ADRs for real architectural choices, RFCs for the trigger-list items in
  docs/architecture/RFC_PROCESS.md
- Efficiency mode: brief updates, build/commit/summarize/wait, no
  re-explaining things already decided
- Non-Negotiables (docs/standards/NON_NEGOTIABLES.md) are load-bearing,
  not decoration — especially #2 (never execute AI output without policy
  validation), #6 (auditable), #7 (destructive requires confirmation)
