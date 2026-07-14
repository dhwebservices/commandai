import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { DevicesService, RegisterDeviceDto, UpdatePresenceDto } from "./devices.service";

/**
 * Controller for device management endpoints.
 * Handles device registration, presence updates, and device queries.
 */
@Controller("v1/devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * Register a new device (called during agent enrollment)
   * POST /v1/devices/register
   */
  @Post("register")
  async registerDevice(@Body() dto: RegisterDeviceDto) {
    const device = await this.devicesService.registerDevice(dto);
    return {
      success: true,
      device,
    };
  }

  /**
   * Update device presence (heartbeat)
   * PUT /v1/devices/:agentId/presence
   */
  @Put(":agentId/presence")
  async updatePresence(
    @Param("agentId") agentId: string,
    @Body() dto: UpdatePresenceDto
  ) {
    const device = await this.devicesService.updatePresence(agentId, dto);
    return {
      success: true,
      device,
    };
  }

  /**
   * Get device by ID
   * GET /v1/devices/:id
   */
  @Get(":id")
  async getDevice(@Param("id") id: string) {
    const device = await this.devicesService.getDeviceById(id);
    return {
      success: true,
      device,
    };
  }

  /**
   * Get all devices for a tenant
   * GET /v1/devices?tenantId=xxx
   */
  @Get()
  async getDevices(@Query("tenantId") tenantId?: string) {
    if (!tenantId) {
      return {
        success: false,
        error: "tenantId query parameter is required",
      };
    }

    const devices = await this.devicesService.getDevicesByTenant(tenantId);
    return {
      success: true,
      devices,
    };
  }

  /**
   * Get online devices for a tenant
   * GET /v1/devices/online?tenantId=xxx
   */
  @Get("online/list")
  async getOnlineDevices(@Query("tenantId") tenantId?: string) {
    if (!tenantId) {
      return {
        success: false,
        error: "tenantId query parameter is required",
      };
    }

    const devices = await this.devicesService.getOnlineDevicesByTenant(tenantId);
    return {
      success: true,
      devices,
    };
  }

  /**
   * Update device metadata
   * PUT /v1/devices/:id/metadata
   */
  @Put(":id/metadata")
  async updateMetadata(
    @Param("id") id: string,
    @Body() metadata: Record<string, any>
  ) {
    const device = await this.devicesService.updateDeviceMetadata(id, metadata);
    return {
      success: true,
      device,
    };
  }
}
