# Architecture

AuthController -> AuthService, which holds two Supabase clients (admin:
service-role, bypasses RLS; anon: used only for signInWithPassword) and an
EmailService (Resend). See AUTH_DESIGN.md for the full signup/login/verify/
reset flow. Tokens for email verification and password reset are
first-party tables (email_verification_tokens, password_reset_tokens),
not Supabase's built-in flows, because auth.users.email is synthetic
(see ADR-009).
