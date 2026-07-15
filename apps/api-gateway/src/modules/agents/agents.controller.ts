import { Controller, Post, Body, Headers, UnauthorizedException } from "@nestjs/common";
import { AgentsService } from "./agents.service";
import { z } from "zod";
import { createSupabaseAdminClient } from "../auth/supabase-admin.client";
import { loadApiGatewayConfig } from "../../config";

const GenerateEnrollmentTokenDto = z.object({
  tenantId: z.string().uuid(),
  expiresInHours: z.number().min(1).max(24).optional().default(1),
});

/**
 * Tenant admin endpoints for agent provisioning.
 * Per RFC-001, generating enrollment tokens is a privileged action
 * (admin-only) — never exposed to end users or agents directly.
 */
@Controller("agents")
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  private async verifyTenantAdmin(authHeader: string | undefined, tenantId: string): Promise<void> {
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("No authorization token provided");
    }

    const token = authHeader.substring(7);
    const config = loadApiGatewayConfig();
    const supabase = createSupabaseAdminClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException("Invalid authorization token");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    // Platform admin can manage any tenant, or user must be admin of the specific tenant
    const isPlatformAdmin = profile?.role === "platform_admin";
    const isTenantAdmin = profile?.role === "admin" && profile?.tenant_id === tenantId;

    if (!isPlatformAdmin && !isTenantAdmin) {
      throw new UnauthorizedException("Admin access required for this tenant");
    }
  }

  /**
   * Generate a new enrollment token for provisioning an agent.
   * Returns tokenId + tokenSecret (show once to admin, never stored/retrievable).
   */
  @Post("enrollment-tokens")
  async generateEnrollmentToken(
    @Headers("authorization") authHeader: string | undefined,
    @Body() body: unknown,
  ): Promise<{ tokenId: string; tokenSecret: string; expiresAt: string }> {
    const dto = GenerateEnrollmentTokenDto.parse(body);
    await this.verifyTenantAdmin(authHeader, dto.tenantId);

    const result = await this.agentsService.generateEnrollmentToken(
      dto.tenantId,
      dto.expiresInHours * 3600_000,
    );

    return result;
  }
}
