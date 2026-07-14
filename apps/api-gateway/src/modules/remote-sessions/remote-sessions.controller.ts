import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import {
  RemoteSessionsService,
  CreateSessionDto,
  UpdateSessionStateDto,
} from "./remote-sessions.service";

/**
 * Controller for remote session management endpoints.
 * Handles session creation, state updates, and queries.
 */
@Controller("v1/remote-sessions")
export class RemoteSessionsController {
  constructor(private readonly sessionsService: RemoteSessionsService) {}

  /**
   * Create a new remote session
   * POST /v1/remote-sessions
   */
  @Post()
  async createSession(@Body() dto: CreateSessionDto) {
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
  async getSession(@Param("id") id: string) {
    const session = await this.sessionsService.getSessionById(id);
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
    @Query("tenantId") tenantId?: string,
    @Query("limit") limit?: string
  ) {
    if (!tenantId) {
      return {
        success: false,
        error: "tenantId query parameter is required",
      };
    }

    const sessions = await this.sessionsService.getSessionsByTenant(
      tenantId,
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
