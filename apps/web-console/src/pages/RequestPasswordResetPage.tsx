import { useState } from "react";
import { Button } from "@commandai/ui-kit";
import { authApi } from "../lib/api-client";

export function RequestPasswordResetPage() {
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.requestPasswordReset({ username });
    } finally {
      // Always show the same message, matching the backend's
      // enumeration-safe response — success/failure looks identical here
      // regardless of whether the username exists.
      setSubmitted(true);
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <h1>Check your email</h1>
        <p>If that username exists, we've sent a password reset link to its contact email.</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Reset your password</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </div>
  );
}
