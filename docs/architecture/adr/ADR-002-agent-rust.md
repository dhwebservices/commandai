# ADR-002: Rust for the agent core
Status: Accepted
Date: 2026-07-09

## Context
The agent is the trust boundary of the product: it runs as a privileged
background service on user machines and must have a low footprint on home-user
hardware.

## Decision
Agent core written in Rust. Local UI (system tray, chat window) via Tauri
webview reusing `packages/ui-kit`.

## Alternatives Considered
- Electron/Node: rejected — too heavy for RAM/CPU targets, weaker memory-safety
  guarantees for a privileged process.
- Go: viable, but weaker sandboxing/memory-safety story than Rust for the
  most security-sensitive component in the system.

## Consequences
Smaller Rust hiring pool, slower initial velocity than TS. Accepted as a
deliberate trade-off given the agent's trust role.
