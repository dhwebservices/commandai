import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from "@nestjs/common";
import {
  RemoteSessionsService,
  CreateSessionDto,
  UpdateSessionStateDto,
} from "./remote-sessions.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

/**
 * Controller for remote session management endpoints.
 * Handles session creation, state updates, and queries.
 * All endpoints require JWT authentication.
 */
@Controller("v1/remote-sessions")
@UseGuards(JwtAuthGuard)
export class RemoteSessionsController {
  constructor(private readonly sessionsService: RemoteSessionsService) {}

  /**
   * Create a new remote session
   * POST /v1/remote-sessions
   */
  @Post()
  async createSession(@Request() req: any, @Body() dto: CreateSessionDto) {
    // Verify tenant isolation - user must belong to same tenant as target device
    const targetDevice = await this.sessionsService.getDeviceById(dto.target_device_id);

    if (targetDevice.tenant_id !== req.user.tenant_id) {
      throw new ForbiddenException('Cannot access device from different tenant');
    }

    const session = await this.sessionsService.createSession(dto);
    return {
      success: true,
      session,
    };
  }

  /**
   * Get session by ID
   * GET /v1/remote-sessions/:id
   */
  @Get(":id")
  async getSession(@Request() req: any, @Param("id") id: string) {
    const session = await this.sessionsService.getSessionById(id);

    // Verify tenant isolation
    if (session.tenant_id !== req.user.tenant_id) {
      throw new ForbiddenException('Cannot access session from different tenant');
    }

    return {
      success: true,
      session,
    };
  }

  /**
   * Get all sessions for a tenant
   * GET /v1/remote-sessions?tenantId=xxx&limit=50
   */
  @Get()
  async getSessions(
    @Request() req: any,
    @Query("tenantId") tenantId?: string,
    @Query("limit") limit?: string
  ) {
    // Use authenticated user's tenant_id, ignore query parameter
    const userTenantId = req.user.tenant_id;

    const sessions = await this.sessionsService.getSessionsByTenant(
      userTenantId,
      limit ? parseInt(limit) : 50
    );
    return {
      success: true,
      sessions,
    };
  }

  /**
   * Get session history for a device
   * GET /v1/remote-sessions/device/:deviceId/history
   */
  @Get("device/:deviceId/history")
  async getDeviceHistory(
    @Param("deviceId") deviceId: string,
    @Query("limit") limit?: string
  ) {
    const sessions = await this.sessionsService.getSessionHistoryForDevice(
      deviceId,
      limit ? parseInt(limit) : 20
    );
    return {
      success: true,
      sessions,
    };
  }

  /**
   * Get active sessions for a device
   * GET /v1/remote-sessions/device/:deviceId/active
   */
  @Get("device/:deviceId/active")
  async getActiveDeviceSessions(@Param("deviceId") deviceId: string) {
    const sessions = await this.sessionsService.getActiveSessionsForDevice(deviceId);
    return {
      success: true,
      sessions,
    };
  }

  /**
   * Update session state
   * PUT /v1/remote-sessions/:id/state
   */
  @Put(":id/state")
  async updateSessionState(
    @Param("id") id: string,
    @Body() dto: UpdateSessionStateDto
  ) {
    const session = await this.sessionsService.updateSessionState(id, dto);
    return {
      success: true,
      session,
    };
  }

  /**
   * End a session
   * DELETE /v1/remote-sessions/:id
   */
  @Delete(":id")
  async endSession(
    @Param("id") id: string,
    @Body() body: { reason?: string; actorId?: string }
  ) {
    const session = await this.sessionsService.endSession(
      id,
      body.reason,
      body.actorId
    );
    return {
      success: true,
      session,
    };
  }

  /**
   * Update session notes
   * PUT /v1/remote-sessions/:id/notes
   */
  @Put(":id/notes")
  async updateSessionNotes(
    @Param("id") id: string,
    @Body() body: { notes: string }
  ) {
    const session = await this.sessionsService.updateSessionNotes(id, body.notes);
    return {
      success: true,
      session,
    };
  }

  /**
   * Get session events timeline
   * GET /v1/remote-sessions/:id/events
   */
  @Get(":id/events")
  async getSessionEvents(@Param("id") id: string) {
    const events = await this.sessionsService.getSessionEvents(id);
    return {
      success: true,
      events,
    };
  }
}
