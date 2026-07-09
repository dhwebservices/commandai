# API

- `findById(tenantId) -> Tenant | null`
- `updateBlockedCapabilities(tenantId, ids) -> void`
- `addMember(tenantId, profileId, role) -> void` (Phase 2 invite flow entry point)

No `create()` here — see auth.service.ts signup flow (ADR-009).
No HTTP/gRPC surface yet — consumed as a library by api-gateway.
