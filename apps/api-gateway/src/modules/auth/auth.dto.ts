import { z } from "zod";

// Usernames: alphanumeric + underscore/hyphen, 3-32 chars. Deliberately
// restrictive in Phase 1 — loosen later via a proper RFC-free coding
// change if needed, not a schema change requiring migration.
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

export const SignupRequest = z.object({
  username: z.string().regex(USERNAME_PATTERN, "3-32 chars: letters, numbers, _ or -"),
  contactEmail: z.string().email(),
  password: z.string().min(8, "Minimum 8 characters"),
  fullName: z.string().optional(),
  accountType: z.enum(["personal", "organization"]).optional().default("personal"),
  // Organization fields (only used when accountType is "organization")
  orgName: z.string().optional(),
  orgType: z.enum(["business", "enterprise", "nonprofit", "education"]).optional(),
  orgSize: z.enum(["1-10", "11-50", "51-200", "201-500", "501+"]).optional(),
  orgIndustry: z.string().optional(),
  orgDescription: z.string().optional(),
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

export const JoinOrganizationRequest = z.object({
  inviteCode: z.string().length(6, "Invitation code must be 6 characters"),
  username: z.string().regex(USERNAME_PATTERN, "3-32 chars: letters, numbers, _ or -"),
  contactEmail: z.string().email(),
  password: z.string().min(8, "Minimum 8 characters"),
  fullName: z.string().optional(),
});
export type JoinOrganizationRequest = z.infer<typeof JoinOrganizationRequest>;

export function syntheticEmailFor(username: string): string {
  return `${username.toLowerCase()}@login.commandai.internal`;
}
