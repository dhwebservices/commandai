# policy-engine

Single enforcement point for every Intent before execution. No caller
(agent, api-gateway, MSP console) may bypass this. Trust-critical module —
full doc set required (see docs/standards/MODULE_DOCS.md).

## Must never depend on
apps/* directly. Only packages/schema, packages/errors, packages/logger,
packages/config.

See Architecture.md, API.md, Testing.md, Security.md, Examples.md.
