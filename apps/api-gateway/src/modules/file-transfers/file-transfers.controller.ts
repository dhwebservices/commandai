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
  FileTransfersService,
  CreateFileTransferDto,
  UpdateTransferProgressDto,
  CompleteTransferDto,
} from "./file-transfers.service";

/**
 * Controller for file transfer management endpoints.
 * Handles transfer tracking, progress updates, and audit queries.
 */
@Controller("v1/file-transfers")
export class FileTransfersController {
  constructor(private readonly transfersService: FileTransfersService) {}

  /**
   * Create a new file transfer record
   * POST /v1/file-transfers
   */
  @Post()
  async createTransfer(@Body() dto: CreateFileTransferDto) {
    const transfer = await this.transfersService.createTransfer(dto);
    return {
      success: true,
      transfer,
    };
  }

  /**
   * Get transfer by ID
   * GET /v1/file-transfers/:id
   */
  @Get(":id")
  async getTransfer(@Param("id") id: string) {
    const transfer = await this.transfersService.getTransferById(id);
    return {
      success: true,
      transfer,
    };
  }

  /**
   * Get transfer by transfer_id
   * GET /v1/file-transfers/by-transfer-id/:transferId
   */
  @Get("by-transfer-id/:transferId")
  async getTransferByTransferId(@Param("transferId") transferId: string) {
    const transfer = await this.transfersService.getTransferByTransferId(transferId);
    return {
      success: true,
      transfer,
    };
  }

  /**
   * Get all transfers for a session
   * GET /v1/file-transfers/session/:sessionId
   */
  @Get("session/:sessionId")
  async getSessionTransfers(@Param("sessionId") sessionId: string) {
    const transfers = await this.transfersService.getTransfersBySession(sessionId);
    return {
      success: true,
      transfers,
    };
  }

  /**
   * Get transfers by tenant
   * GET /v1/file-transfers?tenantId=xxx&limit=50
   */
  @Get()
  async getTransfers(
    @Query("tenantId") tenantId?: string,
    @Query("limit") limit?: string
  ) {
    if (!tenantId) {
      return {
        success: false,
        error: "tenantId query parameter is required",
      };
    }

    const transfers = await this.transfersService.getTransfersByTenant(
      tenantId,
      limit ? parseInt(limit) : 50
    );
    return {
      success: true,
      transfers,
    };
  }

  /**
   * Get active transfers
   * GET /v1/file-transfers/active?sessionId=xxx
   */
  @Get("active/list")
  async getActiveTransfers(@Query("sessionId") sessionId?: string) {
    const transfers = await this.transfersService.getActiveTransfers(sessionId);
    return {
      success: true,
      transfers,
    };
  }

  /**
   * Update transfer progress
   * PUT /v1/file-transfers/:transferId/progress
   */
  @Put(":transferId/progress")
  async updateProgress(
    @Param("transferId") transferId: string,
    @Body() dto: UpdateTransferProgressDto
  ) {
    const transfer = await this.transfersService.updateProgress(transferId, dto);
    return {
      success: true,
      transfer,
    };
  }

  /**
   * Complete a transfer
   * PUT /v1/file-transfers/:transferId/complete
   */
  @Put(":transferId/complete")
  async completeTransfer(
    @Param("transferId") transferId: string,
    @Body() dto: CompleteTransferDto
  ) {
    const transfer = await this.transfersService.completeTransfer(transferId, dto);
    return {
      success: true,
      transfer,
    };
  }

  /**
   * Cancel a transfer
   * DELETE /v1/file-transfers/:transferId
   */
  @Delete(":transferId")
  async cancelTransfer(@Param("transferId") transferId: string) {
    const transfer = await this.transfersService.cancelTransfer(transferId);
    return {
      success: true,
      transfer,
    };
  }

  /**
   * Get transfer statistics for a session
   * GET /v1/file-transfers/session/:sessionId/stats
   */
  @Get("session/:sessionId/stats")
  async getSessionStats(@Param("sessionId") sessionId: string) {
    const stats = await this.transfersService.getSessionTransferStats(sessionId);
    return {
      success: true,
      stats,
    };
  }

  /**
   * Delete old completed transfers (cleanup)
   * POST /v1/file-transfers/cleanup
   */
  @Post("cleanup")
  async cleanup(@Body() body: { daysOld?: number }) {
    const result = await this.transfersService.deleteOldTransfers(
      body.daysOld || 30
    );
    return result;
  }
}
