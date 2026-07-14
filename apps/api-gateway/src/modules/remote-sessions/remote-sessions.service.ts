import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DevicesService } from "../devices/devices.service";

export type SessionType = "interactive" | "view_only" | "unattended" | "file_transfer_only";
export type SessionState =
  | "requested"
  | "pending_approval"
  | "connecting"
  | "connected"
  | "disconnected"
  | "completed"
  | "failed"
  | "cancelled";

export interface RemoteSession {
  id: string;
  tenant_id: string;
  target_device_id: string;
  initiator_user_id: string;
  current_controller_user_id: string | null;
  session_type: SessionType;
  permissions: Record<string, any>;
  state: SessionState;
  state_history: Array<{ state: SessionState; timestamp: string; actor?: string }>;
  connection_type: "direct" | "relayed" | null;
  peer_connection_id: string | null;
  signaling_metadata: Record<string, any> | null;
  quality_metrics: Record<string, any> | null;
  is_recorded: boolean;
  recording_id: string | null;
  requested_at: string;
  connected_at: string | null;
  disconnected_at: string | null;
  completed_at: string | null;
  disconnect_reason: string | null;
  session_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionDto {
  target_device_id: string;
  initiator_user_id: string;
  tenant_id: string;
  session_type: SessionType;
  permissions?: Record<string, any>;
}

export interface UpdateSessionStateDto {
  state: SessionState;
  actor?: string;
  connection_type?: "direct" | "relayed";
  peer_connection_id?: string;
  disconnect_reason?: string;
}

/**
 * Service for remote session lifecycle management.
 * Handles session creation, state transitions, and queries.
 */
@Injectable()
export class RemoteSessionsService {
  private readonly supabase: SupabaseClient;

  constructor(private readonly devicesService: DevicesService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create a new remote session
   */
  async createSession(dto: CreateSessionDto): Promise<RemoteSession> {
    // Verify device exists and is online
    const device = await this.devicesService.getDeviceById(dto.target_device_id);
    if (device.status === "offline") {
      throw new BadRequestException("Target device is offline");
    }

    const now = new Date().toISOString();
    const defaultPermissions = {
      control: dto.session_type === "interactive" || dto.session_type === "unattended",
      clipboard: true,
      fileTransfer: true,
      audio: false,
    };

    const { data, error } = await this.supabase
      .from("remote_sessions")
      .insert({
        tenant_id: dto.tenant_id,
        target_device_id: dto.target_device_id,
        initiator_user_id: dto.initiator_user_id,
        current_controller_user_id:
          dto.session_type === "view_only" ? null : dto.initiator_user_id,
        session_type: dto.session_type,
        permissions: dto.permissions || defaultPermissions,
        state: "requested",
        state_history: [{ state: "requested", timestamp: now, actor: dto.initiator_user_id }],
        is_recorded: false,
        requested_at: now,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    // Log session event
    await this.logSessionEvent(data.id, dto.tenant_id, "session_requested", {
      initiator: dto.initiator_user_id,
      device: dto.target_device_id,
      type: dto.session_type,
    }, dto.initiator_user_id);

    return data as RemoteSession;
  }

  /**
   * Update session state
   */
  async updateSessionState(
    sessionId: string,
    dto: UpdateSessionStateDto
  ): Promise<RemoteSession> {
    const session = await this.getSessionById(sessionId);
    const now = new Date().toISOString();

    // Add to state history
    const newStateHistory = [
      ...session.state_history,
      { state: dto.state, timestamp: now, actor: dto.actor },
    ];

    const updateData: any = {
      state: dto.state,
      state_history: newStateHistory,
      updated_at: now,
    };

    // Update timestamps based on state
    if (dto.state === "connected" && !session.connected_at) {
      updateData.connected_at = now;
    }
    if (dto.state === "disconnected" && !session.disconnected_at) {
      updateData.disconnected_at = now;
    }
    if ((dto.state === "completed" || dto.state === "failed" || dto.state === "cancelled") && !session.completed_at) {
      updateData.completed_at = now;
    }

    // Update connection details
    if (dto.connection_type) {
      updateData.connection_type = dto.connection_type;
    }
    if (dto.peer_connection_id) {
      updateData.peer_connection_id = dto.peer_connection_id;
    }
    if (dto.disconnect_reason) {
      updateData.disconnect_reason = dto.disconnect_reason;
    }

    const { data, error } = await this.supabase
      .from("remote_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update session state: ${error?.message || "Session not found"}`);
    }

    // Log session event
    await this.logSessionEvent(sessionId, session.tenant_id, `session_${dto.state}`, {
      from_state: session.state,
      to_state: dto.state,
    }, dto.actor);

    return data as RemoteSession;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<RemoteSession> {
    const { data, error } = await this.supabase
      .from("remote_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return data as RemoteSession;
  }

  /**
   * Get active sessions for a device
   */
  async getActiveSessionsForDevice(deviceId: string): Promise<RemoteSession[]> {
    const { data, error } = await this.supabase
      .from("remote_sessions")
      .select("*")
      .eq("target_device_id", deviceId)
      .in("state", ["requested", "pending_approval", "connecting", "connected"])
      .order("requested_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get active sessions: ${error.message}`);
    }

    return (data as RemoteSession[]) || [];
  }

  /**
   * Get all sessions for a tenant
   */
  async getSessionsByTenant(tenantId: string, limit: number = 50): Promise<RemoteSession[]> {
    const { data, error } = await this.supabase
      .from("remote_sessions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("requested_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get sessions: ${error.message}`);
    }

    return (data as RemoteSession[]) || [];
  }

  /**
   * Get session history for a device
   */
  async getSessionHistoryForDevice(deviceId: string, limit: number = 20): Promise<RemoteSession[]> {
    const { data, error } = await this.supabase
      .from("remote_sessions")
      .select("*")
      .eq("target_device_id", deviceId)
      .order("requested_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get session history: ${error.message}`);
    }

    return (data as RemoteSession[]) || [];
  }

  /**
   * End a session
   */
  async endSession(sessionId: string, reason?: string, actorId?: string): Promise<RemoteSession> {
    return this.updateSessionState(sessionId, {
      state: "completed",
      disconnect_reason: reason || "User ended session",
      actor: actorId,
    });
  }

  /**
   * Update session notes
   */
  async updateSessionNotes(sessionId: string, notes: string): Promise<RemoteSession> {
    const { data, error } = await this.supabase
      .from("remote_sessions")
      .update({
        session_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return data as RemoteSession;
  }

  /**
   * Log session event
   */
  private async logSessionEvent(
    sessionId: string,
    tenantId: string,
    eventType: string,
    eventData: Record<string, any>,
    actorId?: string
  ): Promise<void> {
    const { error } = await this.supabase.from("session_events").insert({
      session_id: sessionId,
      tenant_id: tenantId,
      event_type: eventType,
      event_data: eventData,
      actor_id: actorId || null,
      occurred_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log session event:", error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Get session events timeline
   */
  async getSessionEvents(sessionId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("session_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("occurred_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to get session events: ${error.message}`);
    }

    return data || [];
  }
}
