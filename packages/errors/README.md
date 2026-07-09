# @commandai/errors

Shared error class hierarchy: ValidationError, PolicyDeniedError,
CapabilityNotFoundError, AgentUnreachableError, InternalError.

PolicyDeniedError always carries policyId + capabilityId context for the
audit stream.

## Must never depend on
Any app or service package.
