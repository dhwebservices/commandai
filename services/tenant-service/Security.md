# Security

- Every tenant must have >=1 owner at all times — enforced by schema
  (`members.min(1)`) and `assertHasOwner`.
- `parentTenantId` establishes MSP->client visibility but must never be
  used to implicitly grant capability permissions across tenants — that
  requires explicit RBAC checks in policy-engine, not inferred from
  hierarchy alone.
- No tenant record is ever hard-deleted (see Non-Negotiables — destructive
  actions require confirmation, and tenant deletion crosses into
  compliance/audit-retention territory — treat as an RFC item, not a
  default CRUD delete, when built).
