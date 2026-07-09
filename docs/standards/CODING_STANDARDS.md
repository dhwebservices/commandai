# Coding Standards

## TypeScript
- Strict mode everywhere. No implicit `any`.
- Named exports only, no default exports.
- Shared lint/format config: root `eslint.config.js`, `.prettierrc.json`.

## Rust
- `clippy` + `rustfmt` enforced in CI.
- `#![deny(unsafe_code)]` by default; unsafe blocks require an ADR.

## Python
- `ruff` for lint/format, `mypy --strict`.
- Pydantic models for all data crossing service boundaries.

## Naming
- Shared domain terms (`Intent`, `Capability`, `ActionPlan`, `AuditEvent`) must
  match exactly across languages. See `packages/schema/GLOSSARY.md`.

## General
- No commented-out code.
- No TODO without a linked issue.
- Every package has a README stating purpose, public API, and what it must
  never depend on.
