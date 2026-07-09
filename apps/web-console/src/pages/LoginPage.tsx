import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@commandai/ui-kit";
import { authApi, ApiError } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await authApi.login({ username, password });
      setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId: result.userId,
      });
      navigate("/");
    } catch (err) {
      // Deliberately generic — mirrors the backend's no-enumeration-signal
      // response (see apps/api-gateway AUTH_DESIGN.md).
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Log in to CommandAI</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <p>
        <Link to="/request-password-reset">Forgot password?</Link>
      </p>
      <p>
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
