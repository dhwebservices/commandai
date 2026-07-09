/**
 * Thin wrapper around Resend's REST API. Only sends to profiles.contact_email
 * — never the synthetic Supabase Auth email. See AUTH_DESIGN.md.
 */
export class EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
  ) {}

  private async send(to: string, subject: string, html: string): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: this.fromEmail, to, subject, html }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend send failed (${response.status}): ${body}`);
    }
  }

  async sendVerificationEmail(to: string, username: string, token: string): Promise<void> {
    await this.send(
      to,
      "Verify your CommandAI account",
      `<p>Hi ${username},</p>
       <p>Confirm your email to finish setting up your CommandAI account:</p>
       <p><a href="https://app.commandai.dev/verify-email?token=${token}">Verify email</a></p>
       <p>This link expires in 24 hours. If you didn't create this account, ignore this email.</p>`,
    );
  }

  async sendPasswordResetEmail(to: string, username: string, token: string): Promise<void> {
    await this.send(
      to,
      "Reset your CommandAI password",
      `<p>Hi ${username},</p>
       <p>Reset your password using the link below:</p>
       <p><a href="https://app.commandai.dev/reset-password?token=${token}">Reset password</a></p>
       <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    );
  }
}
