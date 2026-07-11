import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@commandai/ui-kit";
import { authApi, ApiError } from "../lib/api-client";

export function SignupPage() {
  const [username, setUsername] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.signup({ username, contactEmail, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <h1>Check your email</h1>
        <p>We sent a verification link to {contactEmail}. Confirm it, then log in.</p>
        <Link to="/login">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Create your CommandAI account</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={32}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Contact email
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Sign up"}
        </Button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
