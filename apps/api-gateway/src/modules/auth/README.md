# auth module

Trust-critical (see docs/standards/MODULE_DOCS.md — auth is explicitly
listed). Username/password login backed by Supabase Auth + Resend email
delivery (ADR-009). Full doc set: this README, Architecture.md, API.md,
Testing.md, Security.md, Examples.md, plus AUTH_DESIGN.md for the detailed
flow rationale.

## Must never depend on
web-console or any frontend code. Never expose SUPABASE_SERVICE_ROLE_KEY
outside this module's backend process.
