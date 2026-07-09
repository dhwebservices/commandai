import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { RequestPasswordResetPage } from "./pages/RequestPasswordResetPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

function HomePage() {
  const { session, setSession } = useAuth();
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div>
      <p>Logged in as user {session.userId}.</p>
      <button onClick={() => setSession(null)}>Log out</button>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
