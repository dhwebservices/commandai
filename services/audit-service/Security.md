# Security

- Audit events are never mutated or deleted once written — no update/delete
  methods exist on `AuditLog`, and the Phase 2 DB role will enforce this at
  the grant level, not just in application code (defense in depth).
- `recordTransition` validates the transition itself before logging — this
  keeps the audit log from ever containing a state-machine-impossible
  entry, which would otherwise undermine trust in the whole log.
