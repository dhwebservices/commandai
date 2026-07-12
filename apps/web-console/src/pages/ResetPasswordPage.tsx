import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Input } from "@comandr/ui-kit";
import { authApi, ApiError } from "../lib/api-client";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-success text-center">
          <h1>Password updated</h1>
          <p style={{ marginBottom: "1.5rem" }}>Your password has been successfully updated.</p>
          <Button as={Link} to="/login" style={{ width: "100%" }}>
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Set a new password</h1>
        <form onSubmit={handleSubmit}>
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          {error && <p role="alert">{error}</p>}
          <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
