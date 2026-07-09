# Auth Module Design (ADR-009)

## Identity model
- User-facing identity: **username** (unique, case-insensitive).
- `auth.users.email` (Supabase Auth): synthetic,
  `{username}@login.commandai.internal` — never used for real delivery,
  exists only because Supabase Auth requires an email field internally.
- `profiles.contact_email`: the user's real address. All Resend email
  (verification, password reset) goes here, never to the synthetic address.

## Signup flow
1. Client posts `{ username, contactEmail, password }` to `/v1/auth/signup`.
2. Backend creates a new `home` tenant (tenant-of-one, Design Principle #3)
   with this user as `owner`.
3. Backend calls Supabase Admin `createUser` with the synthetic email,
   `email_confirm: true` (we do NOT use Supabase's own confirmation flow —
   see below), and the user's real password (Supabase handles hashing).
4. Backend inserts a `profiles` row (`username`, `contact_email`,
   `tenant_id`, `role: owner`, `email_verified: false`).
5. Backend creates an `email_verification_tokens` row and sends a
   verification email via Resend to `contact_email`.

## Login flow
1. Client posts `{ username, password }` to `/v1/auth/login`.
2. Backend looks up `profiles` by `lower(username)` to get the synthetic
   email, then calls Supabase's `signInWithPassword` with that email +
   the given password.
3. On success, returns the Supabase session (`access_token`,
   `refresh_token`) to the client.
4. Error messages are deliberately generic ("invalid username or
   password") whether the username doesn't exist or the password is
   wrong — no enumeration signal beyond what a public unique-username
   system already inherently allows (see ADR-009 Consequences).

## Email verification
- `/v1/auth/verify-email` — client posts `{ token }`. Backend checks the
  token is unexpired/unconsumed, marks `profiles.email_verified = true`,
  consumes the token.

## Password reset
- `/v1/auth/request-password-reset` — client posts `{ username }`. Backend
  always returns a generic success response regardless of whether the
  username exists (prevents enumeration via this endpoint specifically),
  but only actually creates a token + sends email if the username is real.
- `/v1/auth/reset-password` — client posts `{ token, newPassword }`.
  Backend validates the token, calls Supabase Admin `updateUserById` to
  set the new password, consumes the token.

## What this module must never do
- Never send the synthetic email anywhere in an API response or log —
  it's an internal implementation detail, not something a client should
  see or rely on.
- Never load `SUPABASE_SERVICE_ROLE_KEY` outside this backend process.
- Never skip token expiry/consumed checks "just this once" for either
  token table.
