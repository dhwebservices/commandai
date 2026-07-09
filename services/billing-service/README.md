# billing-service

Interface + stub only in Phase 1. Real provider integration (Stripe or
alternative) is a Phase 2 RFC — new external dependency touching the
tenant/auth model.

## Must never depend on
apps/* directly.
