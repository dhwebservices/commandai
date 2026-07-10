# Quality Gates

No milestone is complete until all are true:

- [ ] Builds successfully (all workspaces)
- [ ] Passes all tests (unit, integration, contract)
- [ ] No critical lint errors
- [ ] Documentation updated
- [ ] API documented (generated, not hand-written)
- [ ] Security reviewed
- [ ] Database migrations validated
- [ ] CI green on `main`

**Current state (post ADR-009):** the real schema lives in Supabase
(`supabase/migrations/`, applied via MCP). CI does not yet apply these
against a disposable database per run — that requires a Supabase
branch/project per CI run, not yet set up (tracked follow-up). Until then,
"migrations validated" means: a new numbered file was added to
`supabase/migrations/` AND applied live via Supabase MCP/CLI in the same
change — checked manually, not by CI. Flagging this honestly rather than
claiming automated coverage that doesn't exist yet.
