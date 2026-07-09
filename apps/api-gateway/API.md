# API

## GET /v1/health
Returns `{ status: "ok", service: "api-gateway", version: "v1" }`.

All future endpoints follow the `/v1/*` prefix pattern (URI versioning,
Non-Negotiable #4). Breaking changes to any published endpoint require a
deprecation window (Non-Negotiable #9) and, if the change affects the
public contract broadly, an RFC.
