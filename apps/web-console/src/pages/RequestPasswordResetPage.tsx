import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@commandai/ui-kit";
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
      setSubmitted(true);
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-success text-center">
          <h1>Check your email</h1>
          <p style={{ marginBottom: "1.5rem" }}>
            If that username exists, we've sent a password reset link to its contact email.
          </p>
          <Button as={Link} to="/login" style={{ width: "100%" }}>
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset your password</h1>
        <form onSubmit={handleSubmit}>
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Enter your username"
          />
          <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>
        <div className="auth-links">
          <p>
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
