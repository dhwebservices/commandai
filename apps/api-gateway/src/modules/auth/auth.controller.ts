import { Body, Controller, Post } from "@nestjs/common";
import {
  SignupRequest,
  LoginRequest,
  VerifyEmailRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
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
    const email = new EmailService(config.RESEND_API_KEY, config.RESEND_FROM_EMAIL);
    this.authService = new AuthService(admin, anon, email);
  }

  @Post("signup")
  async signup(@Body() body: unknown) {
    return this.authService.signup(SignupRequest.parse(body));
  }

  @Post("login")
  async login(@Body() body: unknown) {
    return this.authService.login(LoginRequest.parse(body));
  }

  @Post("verify-email")
  async verifyEmail(@Body() body: unknown) {
    const { token } = VerifyEmailRequest.parse(body);
    return this.authService.verifyEmail(token);
  }

  @Post("request-password-reset")
  async requestPasswordReset(@Body() body: unknown) {
    const { username } = RequestPasswordResetRequest.parse(body);
    return this.authService.requestPasswordReset(username);
  }

  @Post("reset-password")
  async resetPassword(@Body() body: unknown) {
    const { token, newPassword } = ResetPasswordRequest.parse(body);
    return this.authService.resetPassword(token, newPassword);
  }
}
