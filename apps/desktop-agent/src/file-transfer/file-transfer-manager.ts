/**
 * File Transfer Manager
 * Handles chunked file transfer over WebRTC data channel
 */

import { EventEmitter } from 'events';
import { readFile, writeFile, stat } from 'fs/promises';
import { createHash } from 'crypto';
import * as path from 'path';
import {
  TransferControlMessage,
  TransferState,
  FileMetadata,
  FileChunk,
  TransferDirection,
  TransferStatus,
  StartTransferPayload,
  ChunkPayload,
  AckPayload,
  CompletePayload,
  createStartTransferMessage,
  createChunkMessage,
  createAckMessage,
  createPauseMessage,
  createResumeMessage,
  createCancelMessage,
  createCompleteMessage,
  createErrorMessage,
  calculateChunkCount,
  calculateProgress,
  generateTransferId,
  validateFileMetadata,
  DEFAULT_CHUNK_SIZE,
} from './file-transfer-protocol.js';

export interface FileTransferManagerOptions {
  chunkSize?: number; // Chunk size in bytes
  maxConcurrentTransfers?: number; // Max concurrent transfers
  downloadPath?: string; // Default download directory
}

/**
 * FileTransferManager handles file transfers over WebRTC data channel
 *
 * Events:
 *   'transfer-started' - { transferId, metadata }
 *   'transfer-progress' - { transferId, progress }
 *   'transfer-completed' - { transferId, success }
 *   'transfer-error' - { transferId, error }
 *   'transfer-cancelled' - { transferId }
 */
export class FileTransferManager extends EventEmitter {
  private transfers: Map<string, TransferState> = new Map();
  private sendQueues: Map<string, number> = new Map(); // transferId -> next chunk index to send
  private receiveBuffers: Map<string, Map<number, Buffer>> = new Map(); // transferId -> chunk map
  private options: Required<FileTransferManagerOptions>;
  private sendDataChannel: ((message: TransferControlMessage) => boolean) | null = null;

  constructor(options: FileTransferManagerOptions = {}) {
    super();
    this.options = {
      chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE,
      maxConcurrentTransfers: options.maxConcurrentTransfers ?? 5,
      downloadPath: options.downloadPath ?? './downloads',
    };
  }

  /**
   * Set the data channel send function
   */
  setDataChannelSender(sender: (message: TransferControlMessage) => boolean): void {
    this.sendDataChannel = sender;
  }

  /**
   * Start sending a file
   */
  async sendFile(filePath: string): Promise<string> {
    if (!this.sendDataChannel) {
      throw new Error('Data channel sender not set');
    }

    // Check if we're at max concurrent transfers
    const activeTransfers = Array.from(this.transfers.values()).filter(
      (t) => t.status === 'transferring'
    );

    if (activeTransfers.length >= this.options.maxConcurrentTransfers) {
      throw new Error('Maximum concurrent transfers reached');
    }

    // Read file metadata
    const stats = await stat(filePath);
    const filename = path.basename(filePath);
    const hash = await this.calculateFileHash(filePath);

    const transferId = generateTransferId();
    const metadata: FileMetadata = {
      transferId,
      filename,
      size: stats.size,
      hash,
      modifiedTime: stats.mtimeMs,
    };

    // Validate metadata
    const validationError = validateFileMetadata(metadata);
    if (validationError) {
      throw new Error(validationError);
    }

    // Create transfer state
    const totalChunks = calculateChunkCount(stats.size, this.options.chunkSize);
    const transferState: TransferState = {
      transferId,
      metadata,
      direction: 'upload',
      status: 'pending',
      progress: {
        transferId,
        bytesTransferred: 0,
        totalBytes: stats.size,
        chunksReceived: 0,
        totalChunks,
        percentage: 0,
      },
      chunkSize: this.options.chunkSize,
      chunksReceived: new Set(),
      startTime: Date.now(),
    };

    this.transfers.set(transferId, transferState);

    // Send start message
    const startMessage = createStartTransferMessage(
      transferId,
      metadata,
      'upload',
      this.options.chunkSize
    );

    if (!this.sendDataChannel(startMessage)) {
      throw new Error('Failed to send start transfer message');
    }

    // Start sending chunks
    this.sendQueues.set(transferId, 0);
    this.startSendingChunks(transferId, filePath);

    this.emit('transfer-started', { transferId, metadata });

    return transferId;
  }

  /**
   * Send file chunks
   */
  private async startSendingChunks(transferId: string, filePath: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    transfer.status = 'transferring';

    try {
      const fileData = await readFile(filePath);
      const totalChunks = calculateChunkCount(fileData.length, this.options.chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        // Check if transfer was paused or cancelled
        const currentTransfer = this.transfers.get(transferId);
        if (!currentTransfer || currentTransfer.status !== 'transferring') {
          break;
        }

        const start = i * this.options.chunkSize;
        const end = Math.min(start + this.options.chunkSize, fileData.length);
        const chunkData = fileData.slice(start, end);
        const chunkHash = createHash('sha256').update(chunkData).digest('hex');

        const chunk: FileChunk = {
          transferId,
          chunkIndex: i,
          totalChunks,
          data: chunkData.toString('base64'),
          hash: chunkHash,
        };

        const chunkMessage = createChunkMessage(transferId, chunk);

        // Wait for data channel to be ready
        if (this.sendDataChannel && this.sendDataChannel(chunkMessage)) {
          // Update progress
          transfer.progress.bytesTransferred += chunkData.length;
          transfer.progress.chunksReceived = i + 1;
          transfer.progress.percentage = (transfer.progress.bytesTransferred / transfer.progress.totalBytes) * 100;

          this.emit('transfer-progress', { transferId, progress: transfer.progress });

          // Small delay to avoid overwhelming the data channel
          await this.sleep(10);
        } else {
          throw new Error('Failed to send chunk');
        }
      }

      // Send complete message
      transfer.status = 'completed';
      transfer.endTime = Date.now();
      const completeMessage = createCompleteMessage(transferId, true, transfer.metadata.hash);
      this.sendDataChannel?.(completeMessage);

      this.emit('transfer-completed', { transferId, success: true });

    } catch (error) {
      transfer.status = 'failed';
      transfer.error = error instanceof Error ? error.message : String(error);
      const errorMessage = createErrorMessage(transferId, transfer.error);
      this.sendDataChannel?.(errorMessage);

      this.emit('transfer-error', { transferId, error: transfer.error });
    }
  }

  /**
   * Handle incoming transfer message
   */
  handleTransferMessage(message: TransferControlMessage): void {
    const { transferId, control } = message;

    switch (control) {
      case 'start':
        this.handleStartTransfer(message);
        break;

      case 'chunk':
        this.handleChunk(message);
        break;

      case 'ack':
        this.handleAck(message);
        break;

      case 'pause':
        this.handlePause(transferId);
        break;

      case 'resume':
        this.handleResume(message);
        break;

      case 'cancel':
        this.handleCancel(transferId);
        break;

      case 'complete':
        this.handleComplete(message);
        break;

      case 'error':
        this.handleError(message);
        break;

      default:
        console.warn('[FileTransferManager] Unknown control type:', control);
    }
  }

  /**
   * Handle start transfer message
   */
  private handleStartTransfer(message: TransferControlMessage): void {
    const payload = message.payload as StartTransferPayload;
    const { metadata, direction, chunkSize } = payload;

    const totalChunks = calculateChunkCount(metadata.size, chunkSize || this.options.chunkSize);

    const transferState: TransferState = {
      transferId: message.transferId,
      metadata,
      direction: direction === 'upload' ? 'download' : 'upload', // Invert for receiver
      status: 'transferring',
      progress: {
        transferId: message.transferId,
        bytesTransferred: 0,
        totalBytes: metadata.size,
        chunksReceived: 0,
        totalChunks,
        percentage: 0,
      },
      chunkSize: chunkSize || this.options.chunkSize,
      chunksReceived: new Set(),
      startTime: Date.now(),
    };

    this.transfers.set(message.transferId, transferState);
    this.receiveBuffers.set(message.transferId, new Map());

    this.emit('transfer-started', { transferId: message.transferId, metadata });
  }

  /**
   * Handle incoming file chunk
   */
  private async handleChunk(message: TransferControlMessage): Promise<void> {
    const payload = message.payload as ChunkPayload;
    const { chunk } = payload;
    const { transferId, chunkIndex, data, hash } = chunk;

    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      console.error('[FileTransferManager] Transfer not found:', transferId);
      return;
    }

    try {
      // Decode chunk data
      const chunkBuffer = Buffer.from(data, 'base64');

      // Verify chunk hash
      if (hash) {
        const computedHash = createHash('sha256').update(chunkBuffer).digest('hex');
        if (computedHash !== hash) {
          throw new Error(`Chunk ${chunkIndex} hash mismatch`);
        }
      }

      // Store chunk
      const buffer = this.receiveBuffers.get(transferId);
      if (buffer) {
        buffer.set(chunkIndex, chunkBuffer);
        transfer.chunksReceived.add(chunkIndex);

        // Update progress
        transfer.progress.bytesTransferred += chunkBuffer.length;
        transfer.progress.chunksReceived = transfer.chunksReceived.size;
        transfer.progress.percentage = (transfer.progress.bytesTransferred / transfer.progress.totalBytes) * 100;

        this.emit('transfer-progress', { transferId, progress: transfer.progress });

        // Send acknowledgment
        const ackMessage = createAckMessage(transferId, chunkIndex, true);
        this.sendDataChannel?.(ackMessage);

        // Check if transfer is complete
        if (transfer.chunksReceived.size === chunk.totalChunks) {
          await this.finalizeDownload(transferId);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const ackMessage = createAckMessage(transferId, chunkIndex, false, errorMsg);
      this.sendDataChannel?.(ackMessage);

      transfer.status = 'failed';
      transfer.error = errorMsg;
      this.emit('transfer-error', { transferId, error: errorMsg });
    }
  }

  /**
   * Finalize download by writing received chunks to file
   */
  private async finalizeDownload(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    const buffer = this.receiveBuffers.get(transferId);

    if (!transfer || !buffer) return;

    try {
      // Reassemble file from chunks
      const chunks: Buffer[] = [];
      for (let i = 0; i < transfer.progress.totalChunks; i++) {
        const chunk = buffer.get(i);
        if (!chunk) {
          throw new Error(`Missing chunk ${i}`);
        }
        chunks.push(chunk);
      }

      const fileData = Buffer.concat(chunks);

      // Verify file hash if provided
      if (transfer.metadata.hash) {
        const computedHash = createHash('sha256').update(fileData).digest('hex');
        if (computedHash !== transfer.metadata.hash) {
          throw new Error('File hash mismatch');
        }
      }

      // Write file to disk
      const outputPath = path.join(this.options.downloadPath, transfer.metadata.filename);
      await writeFile(outputPath, fileData);

      transfer.status = 'completed';
      transfer.endTime = Date.now();

      this.emit('transfer-completed', { transferId, success: true, path: outputPath });

      // Send complete message
      const completeMessage = createCompleteMessage(transferId, true, transfer.metadata.hash);
      this.sendDataChannel?.(completeMessage);

    } catch (error) {
      transfer.status = 'failed';
      transfer.error = error instanceof Error ? error.message : String(error);
      this.emit('transfer-error', { transferId, error: transfer.error });

      const errorMessage = createErrorMessage(transferId, transfer.error);
      this.sendDataChannel?.(errorMessage);
    }
  }

  /**
   * Handle acknowledgment message
   */
  private handleAck(message: TransferControlMessage): void {
    const payload = message.payload as AckPayload;
    // ACK handling for flow control could be implemented here
    if (!payload.success) {
      console.warn('[FileTransferManager] Chunk rejected:', payload.chunkIndex, payload.error);
    }
  }

  /**
   * Handle pause message
   */
  private handlePause(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (transfer && transfer.status === 'transferring') {
      transfer.status = 'paused';
      console.log('[FileTransferManager] Transfer paused:', transferId);
    }
  }

  /**
   * Handle resume message
   */
  private handleResume(message: TransferControlMessage): void {
    const transferId = message.transferId;
    const transfer = this.transfers.get(transferId);

    if (transfer && transfer.status === 'paused') {
      transfer.status = 'transferring';
      console.log('[FileTransferManager] Transfer resumed:', transferId);
      // Resume sending logic would go here
    }
  }

  /**
   * Handle cancel message
   */
  private handleCancel(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (transfer) {
      transfer.status = 'cancelled';
      this.receiveBuffers.delete(transferId);
      this.sendQueues.delete(transferId);
      this.emit('transfer-cancelled', { transferId });
    }
  }

  /**
   * Handle complete message
   */
  private handleComplete(message: TransferControlMessage): void {
    const payload = message.payload as CompletePayload;
    const transferId = message.transferId;

    const transfer = this.transfers.get(transferId);
    if (transfer) {
      transfer.status = payload.success ? 'completed' : 'failed';
      transfer.endTime = Date.now();
      transfer.error = payload.error;

      this.emit('transfer-completed', { transferId, success: payload.success });
    }
  }

  /**
   * Handle error message
   */
  private handleError(message: TransferControlMessage): void {
    const payload = message.payload;
    const transferId = message.transferId;

    const transfer = this.transfers.get(transferId);
    if (transfer) {
      transfer.status = 'failed';
      transfer.error = payload.error;
      this.emit('transfer-error', { transferId, error: payload.error });
    }
  }

  /**
   * Pause a transfer
   */
  pauseTransfer(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (transfer && transfer.status === 'transferring') {
      transfer.status = 'paused';
      const pauseMessage = createPauseMessage(transferId);
      this.sendDataChannel?.(pauseMessage);
    }
  }

  /**
   * Resume a transfer
   */
  resumeTransfer(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (transfer && transfer.status === 'paused') {
      transfer.status = 'transferring';
      const resumeMessage = createResumeMessage(transferId, Array.from(transfer.chunksReceived));
      this.sendDataChannel?.(resumeMessage);
    }
  }

  /**
   * Cancel a transfer
   */
  cancelTransfer(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (transfer) {
      transfer.status = 'cancelled';
      const cancelMessage = createCancelMessage(transferId);
      this.sendDataChannel?.(cancelMessage);

      this.receiveBuffers.delete(transferId);
      this.sendQueues.delete(transferId);
      this.emit('transfer-cancelled', { transferId });
    }
  }

  /**
   * Get transfer state
   */
  getTransfer(transferId: string): TransferState | undefined {
    return this.transfers.get(transferId);
  }

  /**
   * Get all transfers
   */
  getAllTransfers(): TransferState[] {
    return Array.from(this.transfers.values());
  }

  /**
   * Get active transfers
   */
  getActiveTransfers(): TransferState[] {
    return Array.from(this.transfers.values()).filter(
      (t) => t.status === 'transferring' || t.status === 'pending'
    );
  }

  /**
   * Calculate file hash
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    const data = await readFile(filePath);
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up completed/failed transfers
   */
  cleanup(): void {
    for (const [transferId, transfer] of this.transfers.entries()) {
      if (transfer.status === 'completed' || transfer.status === 'failed' || transfer.status === 'cancelled') {
        this.transfers.delete(transferId);
        this.receiveBuffers.delete(transferId);
        this.sendQueues.delete(transferId);
      }
    }
  }
}
