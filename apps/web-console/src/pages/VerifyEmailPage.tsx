import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
      <h1>Email verification</h1>
      {status === "pending" && <p>Verifying...</p>}
      {status === "success" && (
        <>
          <p>Your email is verified.</p>
          <Link to="/login">Go to login</Link>
        </>
      )}
      {status === "error" && <p role="alert">{message}</p>}
    </div>
  );
}
