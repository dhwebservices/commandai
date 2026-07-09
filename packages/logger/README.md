# @commandai/logger

Structured JSON logger (pino-based). Shared shape: timestamp, service, level,
tenant_id, trace_id, message, context. Auto-redacts sensitive fields.

`audit` events are a separate stream — see services/audit-service — never
mixed with operational logs.

## Must never depend on
Any app or service package.
