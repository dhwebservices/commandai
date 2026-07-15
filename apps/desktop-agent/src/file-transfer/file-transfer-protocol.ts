/**
 * File transfer protocol for WebRTC data channel
 * Supports chunked transfer with resume capability
 */

/**
 * Transfer direction
 */
export type TransferDirection = 'upload' | 'download';

/**
 * Transfer status
 */
export type TransferStatus =
  | 'pending' // Transfer created but not started
  | 'transferring' // Active transfer
  | 'paused' // Transfer paused
  | 'completed' // Transfer completed successfully
  | 'failed' // Transfer failed
  | 'cancelled'; // Transfer cancelled by user

/**
 * File metadata
 */
export interface FileMetadata {
  transferId: string; // Unique transfer ID
  filename: string;
  size: number; // Total file size in bytes
  mimeType?: string;
  hash?: string; // SHA-256 hash for verification
  modifiedTime?: number; // Last modified timestamp
}

/**
 * File chunk
 */
export interface FileChunk {
  transferId: string;
  chunkIndex: number; // 0-based chunk index
  totalChunks: number;
  data: string; // Base64-encoded chunk data
  hash?: string; // SHA-256 hash of this chunk
}

/**
 * Transfer progress
 */
export interface TransferProgress {
  transferId: string;
  bytesTransferred: number;
  totalBytes: number;
  chunksReceived: number;
  totalChunks: number;
  percentage: number; // 0-100
  speed?: number; // Bytes per second
  estimatedTimeRemaining?: number; // Seconds
}

/**
 * Transfer control message types
 */
export type TransferControlType =
  | 'start' // Start a new transfer
  | 'chunk' // Send a file chunk
  | 'ack' // Acknowledge chunk received
  | 'pause' // Pause transfer
  | 'resume' // Resume paused transfer
  | 'cancel' // Cancel transfer
  | 'complete' // Transfer completed
  | 'error'; // Transfer error

/**
 * Transfer control message
 */
export interface TransferControlMessage {
  type: 'file_transfer';
  control: TransferControlType;
  transferId: string;
  timestamp: number;
  payload?: any; // Type-specific payload
}

/**
 * Start transfer message payload
 */
export interface StartTransferPayload {
  metadata: FileMetadata;
  direction: TransferDirection;
  chunkSize?: number; // Chunk size in bytes (default: 64KB)
}

/**
 * Chunk message payload
 */
export interface ChunkPayload {
  chunk: FileChunk;
}

/**
 * Acknowledge message payload
 */
export interface AckPayload {
  chunkIndex: number;
  success: boolean;
  error?: string;
}

/**
 * Complete message payload
 */
export interface CompletePayload {
  success: boolean;
  hash?: string; // Final file hash for verification
  error?: string;
}

/**
 * Error message payload
 */
export interface ErrorPayload {
  error: string;
  chunkIndex?: number;
}

/**
 * Transfer state (tracked by both sender and receiver)
 */
export interface TransferState {
  transferId: string;
  metadata: FileMetadata;
  direction: TransferDirection;
  status: TransferStatus;
  progress: TransferProgress;
  chunkSize: number;
  chunksReceived: Set<number>; // Track which chunks have been received (for resume)
  startTime?: number;
  endTime?: number;
  error?: string;
}

// Default chunk size: 64KB (good balance between throughput and reliability)
export const DEFAULT_CHUNK_SIZE = 64 * 1024;

// Maximum chunk size: 256KB (WebRTC data channel limit is typically 256KB-1MB)
export const MAX_CHUNK_SIZE = 256 * 1024;

/**
 * Create a start transfer message
 */
export function createStartTransferMessage(
  transferId: string,
  metadata: FileMetadata,
  direction: TransferDirection,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): TransferControlMessage {
  return {
    type: 'file_transfer',
    control: 'start',
    transferId,
    timestamp: Date.now(),
    payload: {
      metadata,
      direction,
      chunkSize,
    } as StartTransferPayload,
  };
}

/**
 * Create a chunk message
 */
export function createChunkMessage(
  transferId: string,
  chunk: FileChunk
): TransferControlMessage {
  return {
    type: 'file_transfer',
    control: 'chunk',
    transferId,
    timestamp: Date.now(),
    payload: {
      chunk,
    } as ChunkPayload,
  };
}

/**
 * Create an acknowledgment message
 */
export function createAckMessage(
  transferId: string,
  chunkIndex: number,
  success: boolean,
  error?: string
): TransferControlMessage {
  return {
    type: 'file_transfer',
    control: 'ack',
    transferId,
    timestamp: Date.now(),
    payload: {
      chunkIndex,
      success,
      error,
    } as AckPayload,
  };
}

/**
 * Create a pause message
 */
export function createPauseMessage(transferId: string): TransferControlMessage {
  return {
    type: 'file_transfer',
    control: 'pause',
    transferId,
    timestamp: Date.now(),
  };
}

/**
 * Create a resume message
 */
export function createResumeMessage(
  transferId: string,
  chunksReceived: number[]
): TransferControlMessage {
  return {
    type: 'file_transfer',
    control: 'resume',
    transferId,
    timestamp: Date.now(),
    payload: {
      chunksReceived,
    },
  };
}

/**
 * Create a cancel message
 */
export function createCancelMessage(transferId: string): TransferControlMessage {
  return {
    type: 'file_transfer',
    control: 'cancel',
    transferId,
    timestamp: Date.now(),
  };
}

/**
 * Create a complete message
 */
export function createCompleteMessage(
  transferId: string,
  success: boolean,
  hash?: string,
  error?: string
): TransferControlMessage {
  return {
    type: 'file_transfer',
    control: 'complete',
    transferId,
    timestamp: Date.now(),
    payload: {
      success,
      hash,
      error,
    } as CompletePayload,
  };
}

/**
 * Create an error message
 */
export function createErrorMessage(
  transferId: string,
  error: string,
  chunkIndex?: number
): TransferControlMessage {
  return {
    type: 'file_transfer',
    control: 'error',
    transferId,
    timestamp: Date.now(),
    payload: {
      error,
      chunkIndex,
    } as ErrorPayload,
  };
}

/**
 * Calculate number of chunks for a file
 */
export function calculateChunkCount(fileSize: number, chunkSize: number): number {
  return Math.ceil(fileSize / chunkSize);
}

/**
 * Calculate transfer progress
 */
export function calculateProgress(
  bytesTransferred: number,
  totalBytes: number,
  chunksReceived: number,
  totalChunks: number,
  startTime?: number
): TransferProgress {
  const percentage = totalBytes > 0 ? (bytesTransferred / totalBytes) * 100 : 0;

  let speed: number | undefined;
  let estimatedTimeRemaining: number | undefined;

  if (startTime) {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    if (elapsedSeconds > 0) {
      speed = bytesTransferred / elapsedSeconds;

      const remainingBytes = totalBytes - bytesTransferred;
      if (speed > 0) {
        estimatedTimeRemaining = remainingBytes / speed;
      }
    }
  }

  return {
    transferId: '', // Will be filled by caller
    bytesTransferred,
    totalBytes,
    chunksReceived,
    totalChunks,
    percentage: Math.min(100, Math.max(0, percentage)),
    speed,
    estimatedTimeRemaining,
  };
}

/**
 * Generate unique transfer ID
 */
export function generateTransferId(): string {
  return `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate file metadata
 */
export function validateFileMetadata(metadata: FileMetadata): string | null {
  if (!metadata.filename || metadata.filename.trim() === '') {
    return 'Filename is required';
  }

  if (metadata.size < 0) {
    return 'File size cannot be negative';
  }

  if (metadata.size === 0) {
    return 'File size cannot be zero';
  }

  // Check for invalid characters in filename
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(metadata.filename)) {
    return 'Filename contains invalid characters';
  }

  return null;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format transfer speed for display
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
