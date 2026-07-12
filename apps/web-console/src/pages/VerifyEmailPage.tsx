import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@comandr/ui-kit";
import { authApi, ApiError } from "../lib/api-client";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    authApi
      .verifyEmail({ token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Verification failed.");
      });
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card auth-success text-center">
        <h1>Email verification</h1>
        {status === "pending" && (
          <>
            <div className="loading" style={{ margin: "2rem auto" }}></div>
            <p>Verifying your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <p style={{ marginBottom: "1.5rem" }}>Your email is verified! You can now log in.</p>
            <Button as={Link} to="/login" style={{ width: "100%" }}>
              Go to login
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <p role="alert" style={{ color: "var(--color-error)", marginBottom: "1.5rem" }}>
              {message}
            </p>
            <Button as={Link} to="/login" variant="secondary" style={{ width: "100%" }}>
              Back to login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
