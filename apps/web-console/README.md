# web-console

Multi-tenant web app (React/Vite). Auth screens (login, signup, email
verification, password reset) are the first real product UI — call
api-gateway's /v1/auth/* endpoints (ADR-009). Session tokens stored in
localStorage (not an artifact — this is a real deployed app, browser
storage is appropriate here).

## Must never depend on
Backend services directly — all data access via api-gateway. Never holds
the Supabase service role key — only the backend does.
