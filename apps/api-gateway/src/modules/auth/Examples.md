# Examples

```ts
// Signup
POST /v1/auth/signup
{ "username": "alice", "contactEmail": "alice@example.com", "password": "hunter2fish" }
// -> { userId, tenantId }, verification email sent via Resend

// Login
POST /v1/auth/login
{ "username": "alice", "password": "hunter2fish" }
// -> { accessToken, refreshToken, userId }
```
