import { z } from "zod";

// Usernames: alphanumeric + underscore/hyphen, 3-32 chars. Deliberately
// restrictive in Phase 1 — loosen later via a proper RFC-free coding
// change if needed, not a schema change requiring migration.
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

export const SignupRequest = z.object({
  username: z.string().regex(USERNAME_PATTERN, "3-32 chars: letters, numbers, _ or -"),
  contactEmail: z.string().email(),
  password: z.string().min(8, "Minimum 8 characters"),
});
export type SignupRequest = z.infer<typeof SignupRequest>;

export const LoginRequest = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const VerifyEmailRequest = z.object({
  token: z.string().uuid(),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequest>;

export const RequestPasswordResetRequest = z.object({
  username: z.string().min(1),
});
export type RequestPasswordResetRequest = z.infer<typeof RequestPasswordResetRequest>;

export const ResetPasswordRequest = z.object({
  token: z.string().uuid(),
  newPassword: z.string().min(8, "Minimum 8 characters"),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest>;

export function syntheticEmailFor(username: string): string {
  return `${username.toLowerCase()}@login.commandai.internal`;
}
