# RFC Process

RFCs live in `docs/architecture/rfcs/`, numbered sequentially, using
`RFC_TEMPLATE.md`.

## Required for:
- Changes to the Action lifecycle state machine or Capability schema
- Non-backward-compatible changes to `packages/proto`
- New core data store, messaging system, or multi-tenancy isolation changes
- Auth/authorization model changes
- Breaking changes to a public API
- Adding a new language/runtime to the stack

## Not required for:
Routine work — new endpoints, new internal packages, bug fixes.

An RFC is "Accepted" only after explicit founder sign-off.
