import type { SupabaseClient } from "@supabase/supabase-js";
import { ValidationError, InternalError } from "@comandr/errors";
import { EmailService } from "./email.service";
import { syntheticEmailFor, type SignupRequest, type LoginRequest, type JoinOrganizationRequest } from "./auth.dto";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * See AUTH_DESIGN.md for the full flow rationale. `admin` is the
 * service-role client (bypasses RLS — profiles/tenants/token table writes
 * go through it); `anon` is used only for signInWithPassword.
 */
export class AuthService {
  constructor(
    private readonly admin: SupabaseClient,
    private readonly anon: SupabaseClient,
    private readonly email: EmailService,
  ) {}

  async signup(req: SignupRequest) {
    const usernameLower = req.username.toLowerCase();

    const { data: existing } = await this.admin
      .from("profiles")
      .select("id")
      .ilike("username", usernameLower)
      .maybeSingle();
    if (existing) {
      throw new ValidationError("Username is already taken.");
    }

    // Determine tenant type and name based on account type
    const isOrganization = req.accountType === "organization";
    const tenantName = isOrganization ? (req.orgName || `${req.username}'s Organization`) : `${req.username}'s Home`;
    const tenantType = isOrganization ? (req.orgType === "nonprofit" || req.orgType === "education" ? "business" : req.orgType || "business") : "home";

    // Create tenant with organization metadata if applicable
    const tenantData: any = {
      name: tenantName,
      type: tenantType,
    };

    if (isOrganization) {
      if (req.orgSize) tenantData.org_size = req.orgSize;
      if (req.orgIndustry) tenantData.org_industry = req.orgIndustry;
      if (req.orgDescription) tenantData.org_description = req.orgDescription;
    }

    const { data: tenant, error: tenantError } = await this.admin
      .from("tenants")
      .insert(tenantData)
      .select()
      .single();
    if (tenantError || !tenant) {
      throw new InternalError("Failed to create tenant during signup.", { tenantError });
    }

    const syntheticEmail = syntheticEmailFor(req.username);
    const { data: authUser, error: authError } = await this.admin.auth.admin.createUser({
      email: syntheticEmail,
      password: req.password,
      email_confirm: true, // we handle verification ourselves, not via Supabase's own email flow
    });
    if (authError || !authUser.user) {
      throw new InternalError("Failed to create auth user during signup.", { authError });
    }

    const profileData: any = {
      id: authUser.user.id,
      username: req.username,
      contact_email: req.contactEmail,
      tenant_id: tenant.id,
      role: "owner",
      email_verified: false,
    };

    if (req.fullName) {
      profileData.full_name = req.fullName;
    }

    const { error: profileError } = await this.admin.from("profiles").insert(profileData);
    if (profileError) {
      throw new InternalError("Failed to create profile during signup.", { profileError });
    }

    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString();
    const { data: tokenRow, error: tokenError } = await this.admin
      .from("email_verification_tokens")
      .insert({ profile_id: authUser.user.id, expires_at: expiresAt })
      .select()
      .single();
    if (tokenError || !tokenRow) {
      throw new InternalError("Failed to create verification token.", { tokenError });
    }

    await this.email.sendVerificationEmail(req.contactEmail, req.username, tokenRow.token);

    return { userId: authUser.user.id, tenantId: tenant.id };
  }

  async login(req: LoginRequest) {
    const { data: profile } = await this.admin
      .from("profiles")
      .select("id, username, role, tenant_id")
      .ilike("username", req.username)
      .maybeSingle();

    // Deliberately generic error — no signal on whether the username
    // exists (see AUTH_DESIGN.md).
    const genericError = () => new ValidationError("Invalid username or password.");
    if (!profile) throw genericError();

    const { data, error } = await this.anon.auth.signInWithPassword({
      email: syntheticEmailFor(profile.username),
      password: req.password,
    });
    if (error || !data.session) throw genericError();

    // Fetch tenant info
    const { data: tenant } = await this.admin
      .from("tenants")
      .select("name, type")
      .eq("id", profile.tenant_id)
      .maybeSingle();

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: profile.id,
      role: profile.role || "member",
      tenantId: profile.tenant_id,
      tenantName: tenant?.name || "Personal",
      tenantType: tenant?.type || "home",
    };
  }

  async verifyEmail(token: string) {
    const { data: tokenRow } = await this.admin
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!tokenRow || tokenRow.consumed_at || new Date(tokenRow.expires_at) < new Date()) {
      throw new ValidationError("Invalid or expired verification token.");
    }

    await this.admin
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", tokenRow.profile_id);

    await this.admin
      .from("email_verification_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("token", token);

    return { verified: true };
  }

  async requestPasswordReset(username: string) {
    const { data: profile } = await this.admin
      .from("profiles")
      .select("id, username, contact_email")
      .ilike("username", username)
      .maybeSingle();

    // Always return the same shape regardless of whether the username
    // exists — enumeration protection (see AUTH_DESIGN.md).
    if (!profile) {
      return { requested: true };
    }

    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    const { data: tokenRow, error } = await this.admin
      .from("password_reset_tokens")
      .insert({ profile_id: profile.id, expires_at: expiresAt })
      .select()
      .single();
    if (error || !tokenRow) {
      throw new InternalError("Failed to create password reset token.", { error });
    }

    await this.email.sendPasswordResetEmail(profile.contact_email, profile.username, tokenRow.token);

    return { requested: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const { data: tokenRow } = await this.admin
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!tokenRow || tokenRow.consumed_at || new Date(tokenRow.expires_at) < new Date()) {
      throw new ValidationError("Invalid or expired password reset token.");
    }

    const { error } = await this.admin.auth.admin.updateUserById(tokenRow.profile_id, {
      password: newPassword,
    });
    if (error) {
      throw new InternalError("Failed to update password.", { error });
    }

    await this.admin
      .from("password_reset_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("token", token);

    return { reset: true };
  }

  async joinOrganization(req: JoinOrganizationRequest) {
    const usernameLower = req.username.toLowerCase();

    // Check if username is already taken
    const { data: existing } = await this.admin
      .from("profiles")
      .select("id")
      .ilike("username", usernameLower)
      .maybeSingle();
    if (existing) {
      throw new ValidationError("Username is already taken.");
    }

    // Validate invitation code
    const { data: invitation } = await this.admin
      .from("organization_invitations")
      .select("*, tenants(name, type)")
      .eq("code", req.inviteCode.toUpperCase())
      .maybeSingle();

    if (!invitation || invitation.consumed_at || new Date(invitation.expires_at) < new Date()) {
      throw new ValidationError("Invalid or expired invitation code.");
    }

    // Optionally validate that the email matches the invitation
    if (invitation.email && invitation.email.toLowerCase() !== req.contactEmail.toLowerCase()) {
      throw new ValidationError("This invitation was sent to a different email address.");
    }

    // Create auth user
    const syntheticEmail = syntheticEmailFor(req.username);
    const { data: authUser, error: authError } = await this.admin.auth.admin.createUser({
      email: syntheticEmail,
      password: req.password,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      throw new InternalError("Failed to create auth user.", { authError });
    }

    // Create profile
    const profileData: any = {
      id: authUser.user.id,
      username: req.username,
      contact_email: req.contactEmail,
      tenant_id: invitation.tenant_id,
      role: invitation.role || "member",
      email_verified: false,
    };

    if (req.fullName) {
      profileData.full_name = req.fullName;
    }

    const { error: profileError } = await this.admin.from("profiles").insert(profileData);
    if (profileError) {
      throw new InternalError("Failed to create profile.", { profileError });
    }

    // Mark invitation as consumed
    await this.admin
      .from("organization_invitations")
      .update({
        consumed_by: authUser.user.id,
        consumed_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    // Create verification token
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString();
    const { data: tokenRow, error: tokenError } = await this.admin
      .from("email_verification_tokens")
      .insert({ profile_id: authUser.user.id, expires_at: expiresAt })
      .select()
      .single();
    if (tokenError || !tokenRow) {
      throw new InternalError("Failed to create verification token.", { tokenError });
    }

    await this.email.sendVerificationEmail(req.contactEmail, req.username, tokenRow.token);

    // Return session data so they can be logged in immediately
    const { data, error: signInError } = await this.anon.auth.signInWithPassword({
      email: syntheticEmail,
      password: req.password,
    });
    if (signInError || !data.session) {
      throw new InternalError("Failed to sign in after joining.", { signInError });
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: authUser.user.id,
      role: invitation.role || "member",
      tenantId: invitation.tenant_id,
      tenantName: (invitation.tenants as any)?.name || "Organization",
      tenantType: (invitation.tenants as any)?.type || "business",
    };
  }
}
