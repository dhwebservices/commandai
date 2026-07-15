import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  SignupRequest,
  LoginRequest,
  VerifyEmailRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  JoinOrganizationRequest,
} from "./auth.dto";
import { AuthService } from "./auth.service";
import { createSupabaseAdminClient, createSupabaseAnonClient } from "./supabase-admin.client";
import { EmailService } from "./email.service";
import { loadApiGatewayConfig } from "../../config";

@Controller({ path: "auth", version: "1" })
export class AuthController {
  private readonly authService: AuthService;

  constructor() {
    const config = loadApiGatewayConfig();
    const admin = createSupabaseAdminClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
    const anon = createSupabaseAnonClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    const email = new EmailService(config.RESEND_API_KEY, config.RESEND_FROM_EMAIL, config.WEB_APP_URL);
    this.authService = new AuthService(admin, anon, email);
  }

  @Post("signup")
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 signups per hour
  async signup(@Body() body: unknown) {
    return this.authService.signup(SignupRequest.parse(body));
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 logins per minute
  async login(@Body() body: unknown) {
    return this.authService.login(LoginRequest.parse(body));
  }

  @Post("verify-email")
  async verifyEmail(@Body() body: unknown) {
    const { token } = VerifyEmailRequest.parse(body);
    return this.authService.verifyEmail(token);
  }

  @Post("request-password-reset")
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 requests per hour
  async requestPasswordReset(@Body() body: unknown) {
    const { username } = RequestPasswordResetRequest.parse(body);
    return this.authService.requestPasswordReset(username);
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 resets per hour
  async resetPassword(@Body() body: unknown) {
    const { token, newPassword } = ResetPasswordRequest.parse(body);
    return this.authService.resetPassword(token, newPassword);
  }

  @Post("join-organization")
  async joinOrganization(@Body() body: unknown) {
    return this.authService.joinOrganization(JoinOrganizationRequest.parse(body));
  }
}
