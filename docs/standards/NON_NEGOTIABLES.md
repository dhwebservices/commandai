# Non-Negotiables

These override convenience, deadlines, and any single recommendation elsewhere
in this repo if they conflict. Any PR violating one of these is blocked
regardless of author.

1. Never sacrifice security for convenience.
2. Never execute AI-generated output as a command — only as a validated
   `Intent` against the `Capability` registry, evaluated by `policy-engine`.
3. Every feature must be documented before it's considered done.
4. Every API must be versioned from first release.
5. Every database schema change must go through a migration — no manual
   schema edits, in any environment.
6. Every Action must be auditable.
7. Every destructive Action requires explicit confirmation.
8. Everything must be designed to support enterprise scaling, even when only
   used by home users today.
9. Never break backward compatibility without an approved migration path and
   deprecation window.
10. No module ships without an owner and a test suite.
