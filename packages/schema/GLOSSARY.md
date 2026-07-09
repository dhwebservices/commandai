# Glossary

- **Intent** — structured object the AI orchestration layer produces. Never
  executable code. References a Capability + typed parameters + reasoning.
- **Capability** — a registered, permission-scoped operation the system is
  allowed to perform. Has a risk level (read/mutate/destructive).
- **ActionPlan** — a sequence of Intents required to fulfill a user request.
- **Action** — an instance moving through the lifecycle (see ADR-006).
- **AuditEvent** — immutable record of a state transition or execution.

These terms must mean exactly the same thing in every language/service. Do
not introduce synonyms.
