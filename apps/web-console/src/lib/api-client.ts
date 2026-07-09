const API_BASE = import.meta.env.VITE_API_GATEWAY_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.code ?? "UNKNOWN_ERROR", data.message ?? "Something went wrong.");
  }
  return data as T;
}

export const authApi = {
  signup: (body: { username: string; contactEmail: string; password: string }) =>
    post<{ userId: string; tenantId: string }>("/v1/auth/signup", body),

  login: (body: { username: string; password: string }) =>
    post<{ accessToken: string; refreshToken: string; userId: string }>("/v1/auth/login", body),

  verifyEmail: (body: { token: string }) => post<{ verified: true }>("/v1/auth/verify-email", body),

  requestPasswordReset: (body: { username: string }) =>
    post<{ requested: true }>("/v1/auth/request-password-reset", body),

  resetPassword: (body: { token: string; newPassword: string }) =>
    post<{ reset: true }>("/v1/auth/reset-password", body),
};
