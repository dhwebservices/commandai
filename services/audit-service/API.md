# API

- `AuditLog.append(event)` / `.all()` / `.forAction(actionId)`
- `recordTransition(log, action, toState, actorId, reasoning?)`
- `findExecutedWithoutAudit(actions, log)`

No HTTP/gRPC surface yet — library-level only in Phase 1.
