import { Injectable, NotFoundException } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface Device {
  id: string;
  tenant_id: string;
  agent_id: string;
  hostname: string;
  device_name: string | null;
  os_type: "macos" | "windows" | "linux";
  os_version: string;
  primary_ip: string | null;
  last_known_ip: string | null;
  capabilities: Record<string, any>;
  status: "online" | "offline" | "in_session" | "busy";
  last_seen_at: string | null;
  last_heartbeat_at: string | null;
  device_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RegisterDeviceDto {
  agent_id: string;
  tenant_id: string;
  hostname: string;
  os_type: "macos" | "windows" | "linux";
  os_version: string;
  primary_ip?: string;
  capabilities?: Record<string, any>;
  device_metadata?: Record<string, any>;
}

export interface UpdatePresenceDto {
  status: "online" | "offline" | "in_session" | "busy";
  last_known_ip?: string;
}

/**
 * Service for device registry and presence tracking.
 * Manages all enrolled devices per tenant with online/offline status.
 */
@Injectable()
export class DevicesService {
  private readonly supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Register a new device or update existing device on enrollment
   */
  async registerDevice(dto: RegisterDeviceDto): Promise<Device> {
    const now = new Date().toISOString();

    // Upsert device (insert or update if agent_id already exists)
    const { data, error } = await this.supabase
      .from("devices")
      .upsert(
        {
          agent_id: dto.agent_id,
          tenant_id: dto.tenant_id,
          hostname: dto.hostname,
          os_type: dto.os_type,
          os_version: dto.os_version,
          primary_ip: dto.primary_ip || null,
          last_known_ip: dto.primary_ip || null,
          capabilities: dto.capabilities || {},
          device_metadata: dto.device_metadata || {},
          status: "online",
          last_seen_at: now,
          last_heartbeat_at: now,
          updated_at: now,
        },
        { onConflict: "agent_id" }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register device: ${error.message}`);
    }

    return data as Device;
  }

  /**
   * Update device presence (heartbeat)
   */
  async updatePresence(agentId: string, dto: UpdatePresenceDto): Promise<Device> {
    const now = new Date().toISOString();

    const updateData: any = {
      status: dto.status,
      last_seen_at: now,
      last_heartbeat_at: now,
      updated_at: now,
    };

    if (dto.last_known_ip) {
      updateData.last_known_ip = dto.last_known_ip;
    }

    const { data, error } = await this.supabase
      .from("devices")
      .update(updateData)
      .eq("agent_id", agentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update presence: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`Device with agent_id ${agentId} not found`);
    }

    return data as Device;
  }

  /**
   * Get device by ID
   */
  async getDeviceById(deviceId: string): Promise<Device> {
    const { data, error } = await this.supabase
      .from("devices")
      .select("*")
      .eq("id", deviceId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return data as Device;
  }

  /**
   * Get device by agent ID
   */
  async getDeviceByAgentId(agentId: string): Promise<Device | null> {
    const { data, error } = await this.supabase
      .from("devices")
      .select("*")
      .eq("agent_id", agentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new Error(`Failed to get device: ${error.message}`);
    }

    return data as Device;
  }

  /**
   * Get all devices for a tenant
   */
  async getDevicesByTenant(tenantId: string): Promise<Device[]> {
    const { data, error } = await this.supabase
      .from("devices")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("hostname", { ascending: true });

    if (error) {
      throw new Error(`Failed to get devices: ${error.message}`);
    }

    return (data as Device[]) || [];
  }

  /**
   * Get all online devices for a tenant
   */
  async getOnlineDevicesByTenant(tenantId: string): Promise<Device[]> {
    const { data, error } = await this.supabase
      .from("devices")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "online")
      .order("hostname", { ascending: true });

    if (error) {
      throw new Error(`Failed to get online devices: ${error.message}`);
    }

    return (data as Device[]) || [];
  }

  /**
   * Update device metadata
   */
  async updateDeviceMetadata(
    deviceId: string,
    metadata: Record<string, any>
  ): Promise<Device> {
    const { data, error } = await this.supabase
      .from("devices")
      .update({
        device_metadata: metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deviceId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return data as Device;
  }

  /**
   * Mark devices as offline if they haven't sent heartbeat in 30 seconds
   */
  async markStaleDevicesOffline(): Promise<number> {
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data, error } = await this.supabase
      .from("devices")
      .update({
        status: "offline",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "online")
      .lt("last_heartbeat_at", thirtySecondsAgo)
      .select("id");

    if (error) {
      throw new Error(`Failed to mark stale devices offline: ${error.message}`);
    }

    return data?.length || 0;
  }
}
