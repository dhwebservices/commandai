import { Controller, Get, Post, Put, Delete, Headers, Body, Param, UnauthorizedException } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { createSupabaseAdminClient } from "../auth/supabase-admin.client";
import { loadApiGatewayConfig } from "../../config";
import { z } from "zod";

const CreateUserDto = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["user", "admin", "platform_admin"]),
  tenantId: z.string().uuid().optional(),
});

const UpdateUserDto = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  role: z.enum(["user", "admin", "platform_admin"]).optional(),
  emailVerified: z.boolean().optional(),
  tenantId: z.string().uuid().optional(),
});

const UpdateOrganizationDto = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["business", "team", "enterprise"]).optional(),
  blockedCapabilities: z.array(z.string()).optional(),
});

const ResetPasswordDto = z.object({
  password: z.string().min(8),
});

@Controller({ path: "admin", version: "1" })
export class AdminController {
  private readonly adminService: AdminService;

  constructor() {
    const config = loadApiGatewayConfig();
    const supabase = createSupabaseAdminClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
    this.adminService = new AdminService(supabase);
  }

  private async verifyPlatformAdmin(authHeader: string | undefined) {
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("No authorization token provided");
    }

    const token = authHeader.substring(7);
    const isPlatformAdmin = await this.adminService.verifyPlatformAdmin(token);

    if (!isPlatformAdmin) {
      throw new UnauthorizedException("Platform admin access required");
    }
  }

  @Get("users")
  async listAllUsers(@Headers("authorization") authHeader: string | undefined) {
    await this.verifyPlatformAdmin(authHeader);
    return this.adminService.listAllUsers();
  }

  @Post("users")
  async createUser(@Headers("authorization") authHeader: string | undefined, @Body() body: unknown) {
    await this.verifyPlatformAdmin(authHeader);
    const userData = CreateUserDto.parse(body);
    return this.adminService.createUser(userData);
  }

  @Put("users/:id")
  async updateUser(@Headers("authorization") authHeader: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    await this.verifyPlatformAdmin(authHeader);
    const userData = UpdateUserDto.parse(body);
    return this.adminService.updateUser(id, userData);
  }

  @Delete("users/:id")
  async deleteUser(@Headers("authorization") authHeader: string | undefined, @Param("id") id: string) {
    await this.verifyPlatformAdmin(authHeader);
    return this.adminService.deleteUser(id);
  }

  @Get("organizations")
  async listAllOrganizations(@Headers("authorization") authHeader: string | undefined) {
    await this.verifyPlatformAdmin(authHeader);
    return this.adminService.listAllOrganizations();
  }

  @Put("organizations/:id")
  async updateOrganization(@Headers("authorization") authHeader: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    await this.verifyPlatformAdmin(authHeader);
    const orgData = UpdateOrganizationDto.parse(body);
    return this.adminService.updateOrganization(id, orgData);
  }

  @Delete("organizations/:id")
  async deleteOrganization(@Headers("authorization") authHeader: string | undefined, @Param("id") id: string) {
    await this.verifyPlatformAdmin(authHeader);
    return this.adminService.deleteOrganization(id);
  }

  @Put("users/:id/password")
  async resetUserPassword(@Headers("authorization") authHeader: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    await this.verifyPlatformAdmin(authHeader);
    const { password } = ResetPasswordDto.parse(body);
    return this.adminService.resetUserPassword(id, password);
  }

  @Get("stats")
  async getPlatformStats(@Headers("authorization") authHeader: string | undefined) {
    await this.verifyPlatformAdmin(authHeader);
    return this.adminService.getPlatformStats();
  }
}
