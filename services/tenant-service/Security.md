# Security

- Every tenant must have >=1 owner at all times — enforced by schema
  (`members.min(1)` at the Zod level) and re-checked via `assertHasOwner`
  after any membership change (`addMember`). Supabase-side DB trigger from
  the original local-Postgres migration is not yet ported to the Supabase
  project — tracked follow-up, app-layer check is the only enforcement
  right now (flagging honestly rather than claiming DB-level defense in
  depth that doesn't exist yet on this path).
- `parentTenantId` establishes MSP->client visibility but must never be
  used to implicitly grant capability permissions across tenants.
- `updateBlockedCapabilities` is additive-restrictive only — narrows what's
  allowed, never widens it beyond a Capability's own risk level (mirrors
  policy-engine's rule).
- This repository uses the Supabase client passed to it — callers must
  pass the service-role client (bypasses RLS) only from backend code,
  never construct this repository with a browser-exposed client.
