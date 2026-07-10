# supabase/migrations

Versioned record of every schema change applied to the live Supabase
project "command-ai" (ref `xnmmwqrezspgjspdllzb`), per ADR-009 and
Non-Negotiable #5 ("every database schema change must go through a
migration — no manual schema edits, in any environment").

**Process going forward:** any new schema change must (1) add a new
numbered `.sql` file here in the same commit, and (2) be applied to the
live project (via Supabase MCP or `supabase db push` if the CLI is set up
locally). Neither step alone satisfies the Non-Negotiable — a file with no
live effect is theater, a live change with no file is unversioned.

Current files (`0001`-`0003`) were applied via Supabase MCP on 2026-07-09
and committed here after the fact to close the gap between what's live and
what's in git — see git history for the exact commit.

This directory is unrelated to the deprecated `infra/db/migrations` +
`packages/db` (local Postgres path, see `packages/db/DEPRECATED.md`) —
that path is a fully-offline dev fallback only, not the real schema.
