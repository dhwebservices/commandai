import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * DTO for creating a file transfer record
 */
export interface CreateFileTransferDto {
  sessionId: string;
  tenantId: string;
  transferId: string;
  direction: "upload" | "download";
  fileName: string;
  fileSizeBytes: number;
  fileHash?: string;
  mimeType?: string;
  totalChunks?: number;
  chunkSize?: number;
  modifiedTime?: Date;
}

/**
 * DTO for updating file transfer progress
 */
export interface UpdateTransferProgressDto {
  bytesTransferred: number;
  chunksReceived: number;
  status?: "pending" | "transferring" | "completed" | "failed" | "cancelled";
}

/**
 * DTO for completing a file transfer
 */
export interface CompleteTransferDto {
  success: boolean;
  fileHash?: string;
  errorMessage?: string;
}

/**
 * Service for managing file transfer records in database
 */
@Injectable()
export class FileTransfersService {
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
   * Create a new file transfer record
   */
  async createTransfer(dto: CreateFileTransferDto) {
    const { data, error } = await this.supabase
      .from("file_transfers")
      .insert({
        session_id: dto.sessionId,
        tenant_id: dto.tenantId,
        transfer_id: dto.transferId,
        direction: dto.direction,
        file_name: dto.fileName,
        file_size_bytes: dto.fileSizeBytes,
        file_hash: dto.fileHash,
        mime_type: dto.mimeType,
        total_chunks: dto.totalChunks,
        chunk_size: dto.chunkSize,
        modified_time: dto.modifiedTime?.toISOString(),
        status: "pending",
        bytes_transferred: 0,
        chunks_received: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create file transfer: ${error.message}`);
    }

    return data;
  }

  /**
   * Get file transfer by ID
   */
  async getTransferById(id: string) {
    const { data, error } = await this.supabase
      .from("file_transfers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Failed to get file transfer: ${error.message}`);
    }

    return data;
  }

  /**
   * Get file transfer by transfer_id
   */
  async getTransferByTransferId(transferId: string) {
    const { data, error } = await this.supabase
      .from("file_transfers")
      .select("*")
      .eq("transfer_id", transferId)
      .single();

    if (error) {
      throw new Error(`Failed to get file transfer: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all transfers for a session
   */
  async getTransfersBySession(sessionId: string) {
    const { data, error } = await this.supabase
      .from("file_transfers")
      .select("*")
      .eq("session_id", sessionId)
      .order("started_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get session transfers: ${error.message}`);
    }

    return data;
  }

  /**
   * Get transfers by tenant
   */
  async getTransfersByTenant(tenantId: string, limit: number = 50) {
    const { data, error } = await this.supabase
      .from("file_transfers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get tenant transfers: ${error.message}`);
    }

    return data;
  }

  /**
   * Get active transfers (pending or transferring)
   */
  async getActiveTransfers(sessionId?: string) {
    let query = this.supabase
      .from("file_transfers")
      .select("*")
      .in("status", ["pending", "transferring"]);

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query.order("started_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get active transfers: ${error.message}`);
    }

    return data;
  }

  /**
   * Update transfer progress
   */
  async updateProgress(transferId: string, dto: UpdateTransferProgressDto) {
    const updates: any = {
      bytes_transferred: dto.bytesTransferred,
      chunks_received: dto.chunksReceived,
      updated_at: new Date().toISOString(),
    };

    if (dto.status) {
      updates.status = dto.status;
    }

    const { data, error } = await this.supabase
      .from("file_transfers")
      .update(updates)
      .eq("transfer_id", transferId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update transfer progress: ${error.message}`);
    }

    return data;
  }

  /**
   * Complete a transfer
   */
  async completeTransfer(transferId: string, dto: CompleteTransferDto) {
    const updates: any = {
      status: dto.success ? "completed" : "failed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (dto.fileHash) {
      updates.file_hash = dto.fileHash;
    }

    if (dto.errorMessage) {
      updates.error_message = dto.errorMessage;
    }

    const { data, error } = await this.supabase
      .from("file_transfers")
      .update(updates)
      .eq("transfer_id", transferId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to complete transfer: ${error.message}`);
    }

    return data;
  }

  /**
   * Cancel a transfer
   */
  async cancelTransfer(transferId: string) {
    const { data, error } = await this.supabase
      .from("file_transfers")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("transfer_id", transferId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel transfer: ${error.message}`);
    }

    return data;
  }

  /**
   * Get transfer statistics for a session
   */
  async getSessionTransferStats(sessionId: string) {
    const { data, error } = await this.supabase
      .from("file_transfers")
      .select("status, direction, file_size_bytes, bytes_transferred")
      .eq("session_id", sessionId);

    if (error) {
      throw new Error(`Failed to get transfer stats: ${error.message}`);
    }

    const stats = {
      total: data.length,
      completed: data.filter((t: any) => t.status === "completed").length,
      failed: data.filter((t: any) => t.status === "failed").length,
      cancelled: data.filter((t: any) => t.status === "cancelled").length,
      inProgress: data.filter((t: any) => t.status === "transferring").length,
      uploads: data.filter((t: any) => t.direction === "upload").length,
      downloads: data.filter((t: any) => t.direction === "download").length,
      totalBytes: data.reduce((sum: number, t: any) => sum + (t.file_size_bytes || 0), 0),
      transferredBytes: data.reduce((sum: number, t: any) => sum + (t.bytes_transferred || 0), 0),
    };

    return stats;
  }

  /**
   * Delete old completed transfers (cleanup)
   */
  async deleteOldTransfers(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await this.supabase
      .from("file_transfers")
      .delete()
      .in("status", ["completed", "failed", "cancelled"])
      .lt("completed_at", cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to delete old transfers: ${error.message}`);
    }

    return { success: true };
  }
}
