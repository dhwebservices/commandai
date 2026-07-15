/**
 * File Transfer Module
 *
 * Provides chunked file transfer over WebRTC data channels with resume support.
 * Designed for reliable file transfer in remote desktop sessions.
 *
 * Usage:
 *   import { FileTransferManager } from './file-transfer.js';
 *
 *   const manager = new FileTransferManager(dataChannel);
 *   await manager.sendFile('/path/to/file.txt');
 */

export * from './file-transfer-protocol.js';
export { FileTransferManager, FileTransferManagerOptions } from './file-transfer-manager.js';
