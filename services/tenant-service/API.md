# API

Phase 1: model + validation only (`Tenant`, `TenantMember`, `isHomeTenant`,
`assertHasOwner`). No HTTP/gRPC surface yet — persistence and API layer
tracked for the next milestone once api-gateway exists.

## TenantRepository (added)
- `create(tenant) -> Tenant`
- `findById(tenantId) -> Tenant | null`

Still no HTTP/gRPC surface — consumed as a library by api-gateway when
tenant-aware endpoints are added.
