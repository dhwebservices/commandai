import { Controller, Post, Body } from "@nestjs/common";
import { AgentsService } from "./agents.service";
import { z } from "zod";

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

  /**
   * Generate a new enrollment token for provisioning an agent.
   * Returns tokenId + tokenSecret (show once to admin, never stored/retrievable).
   */
  @Post("enrollment-tokens")
  async generateEnrollmentToken(
    @Body() body: unknown,
  ): Promise<{ tokenId: string; tokenSecret: string; expiresAt: string }> {
    // TODO: Add auth guard to verify user is admin for tenantId
    const dto = GenerateEnrollmentTokenDto.parse(body);

    const result = await this.agentsService.generateEnrollmentToken(
      dto.tenantId,
      dto.expiresInHours * 3600_000,
    );

    return result;
  }
}
