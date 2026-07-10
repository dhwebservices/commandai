# web-console

Multi-tenant web app (React/Vite). Auth screens (login, signup, email
verification, password reset) are the first real product UI — call
api-gateway's /v1/auth/* endpoints (ADR-009). Session tokens stored in
localStorage (not an artifact — this is a real deployed app, browser
storage is appropriate here).

Runs in a browser normally. Can also be built as a native desktop app via
Tauri — see DESKTOP_BUILD.md. This is a pragmatic addition for local UI
review (founder request), not a change to the original app boundaries —
web-console remains the browser-first multi-tenant console; the agent
(apps/agent) is still the only component with real OS-level capabilities
(ADR-002).

## Must never depend on
Backend services directly — all data access via api-gateway. Never holds
the Supabase service role key — only the backend does.
