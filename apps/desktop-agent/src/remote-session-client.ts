import { getWebRTCConfig, monitorConnectionQuality } from './webrtc-config.js';
import { InputHandler } from './input-injection/input-handler.js';
import { createInputInjector } from './input-injection/input-injector.js';
import { ScreenDimensions } from './input-injection/coordinate-translator.js';
import {
  InputEvent,
  deserializeInputEvent,
  createMouseEvent,
  createKeyboardEvent,
  createControlEvent,
  createClipboardEvent,
} from './input-injection/input-protocol.js';
import { ClipboardMonitor, ClipboardContent } from './clipboard/index.js';
import { FileTransferManager } from './file-transfer/file-transfer-manager.js';
import { TransferControlMessage } from './file-transfer/file-transfer-protocol.js';

/**
 * RemoteSessionClient manages WebRTC peer connections for remote desktop sessions.
 * Handles signaling, connection establishment, and media streaming.
 */
export class RemoteSessionClient {
  private peerConnection: RTCPeerConnection | null = null;
  private sessionId: string;
  private role: 'initiator' | 'target';
  private onSignalingMessage: (message: any) => void;
  private dataChannel: RTCDataChannel | null = null;
  private inputHandler: InputHandler | null = null;
  private clipboardMonitor: ClipboardMonitor | null = null;
  private clipboardSyncEnabled = false;
  private fileTransferManager: FileTransferManager | null = null;

  constructor(
    sessionId: string,
    role: 'initiator' | 'target',
    onSignalingMessage: (message: any) => void,
    remoteDimensions?: ScreenDimensions,
    enableClipboard?: boolean,
    downloadPath?: string
  ) {
    this.sessionId = sessionId;
    this.role = role;
    this.onSignalingMessage = onSignalingMessage;
    this.clipboardSyncEnabled = enableClipboard ?? true;

    // Initialize file transfer manager
    this.fileTransferManager = new FileTransferManager({
      downloadPath: downloadPath || './downloads',
      chunkSize: 64 * 1024, // 64KB
      maxConcurrentTransfers: 3,
    });

    // Set up file transfer event handlers
    this.fileTransferManager.on('transfer-started', (event) => {
      console.log('[RemoteSession] Transfer started:', event.transferId);
    });

    this.fileTransferManager.on('transfer-progress', (event) => {
      console.log('[RemoteSession] Transfer progress:', event.transferId, `${event.progress.percentage.toFixed(1)}%`);
    });

    this.fileTransferManager.on('transfer-completed', (event) => {
      console.log('[RemoteSession] Transfer completed:', event.transferId);
    });

    this.fileTransferManager.on('transfer-error', (event) => {
      console.error('[RemoteSession] Transfer error:', event.transferId, event.error);
    });

    // Initialize clipboard monitor
    if (this.clipboardSyncEnabled) {
      this.clipboardMonitor = new ClipboardMonitor({ enabled: false });
      this.clipboardMonitor.on('change', (content: ClipboardContent) => {
        this.handleLocalClipboardChange(content);
      });
      this.clipboardMonitor.on('error', (error: any) => {
        console.error('[RemoteSession] Clipboard monitor error:', error);
      });
    }

    // Initialize input handler for target (remote device)
    if (this.role === 'target' && remoteDimensions) {
      const injector = createInputInjector();
      this.inputHandler = new InputHandler(injector, remoteDimensions, {
        enableInput: true,
        enableClipboard: this.clipboardSyncEnabled,
        logEvents: true,
        clipboardMonitor: this.clipboardMonitor ?? undefined,
      });

      if (!this.inputHandler.isAvailable()) {
        console.warn('[RemoteSession] Input injection not available on this platform');
      }
    }
  }

  /**
   * Initialize WebRTC peer connection
   */
  async init(): Promise<void> {
    const config = getWebRTCConfig();
    this.peerConnection = new RTCPeerConnection(config);

    console.log('[RemoteSession] Initialized WebRTC peer connection');

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[RemoteSession] New ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');

        // Send ICE candidate to other peer via signaling
        this.onSignalingMessage({
          session_id: this.sessionId,
          ice_candidate: {
            candidate: event.candidate.candidate,
            sdp_mid: event.candidate.sdpMid || '',
            sdp_m_line_index: event.candidate.sdpMLineIndex || 0,
          },
        });
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[RemoteSession] ICE connection state:', this.peerConnection?.iceConnectionState);

      if (this.peerConnection?.iceConnectionState === 'connected') {
        console.log('[RemoteSession] WebRTC connection established!');
        this.monitorQuality();
      } else if (this.peerConnection?.iceConnectionState === 'failed') {
        console.error('[RemoteSession] WebRTC connection failed');
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[RemoteSession] Connection state:', this.peerConnection?.connectionState);
    };

    // Handle incoming data channel (for target)
    this.peerConnection.ondatachannel = (event) => {
      console.log('[RemoteSession] Received data channel:', event.channel.label);
      this.setupDataChannel(event.channel);
    };

    // Handle incoming media tracks
    this.peerConnection.ontrack = (event) => {
      console.log('[RemoteSession] Received media track:', event.track.kind);
      // In Phase 3, this will handle screen sharing video/audio
    };

    // Create data channel (for initiator)
    if (this.role === 'initiator') {
      this.dataChannel = this.peerConnection.createDataChannel('remote-control', {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel);
    }
  }

  /**
   * Setup data channel for input events
   */
  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;

    channel.onopen = () => {
      console.log('[RemoteSession] Data channel opened:', channel.label);

      // Wire file transfer manager to data channel
      if (this.fileTransferManager) {
        this.fileTransferManager.setDataChannelSender((message: TransferControlMessage) => {
          return this.sendData(message);
        });
      }
    };

    channel.onclose = () => {
      console.log('[RemoteSession] Data channel closed');
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleDataChannelMessage(message);
      } catch (error) {
        console.error('[RemoteSession] Failed to parse data channel message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error('[RemoteSession] Data channel error:', error);
    };
  }

  /**
   * Handle messages received via data channel
   */
  private handleDataChannelMessage(message: any): void {
    // Check message type
    if (message.type === 'file_transfer') {
      // Route file transfer messages to FileTransferManager
      if (this.fileTransferManager) {
        this.fileTransferManager.handleTransferMessage(message as TransferControlMessage);
      }
      return;
    }

    if (message.type === 'screen_dimensions') {
      // Store remote screen dimensions for coordinate translation
      console.log('[RemoteSession] Remote screen dimensions:', message.dimensions);
      return;
    }

    // Handle input events (mouse, keyboard, clipboard, control)
    if (this.role === 'target' && this.inputHandler) {
      // Target device processes input events from initiator
      try {
        const event = deserializeInputEvent(message);
        if (event) {
          this.inputHandler.handleInputEvent(event);
        } else {
          console.warn('[RemoteSession] Invalid input event:', message);
        }
      } catch (error) {
        console.error('[RemoteSession] Failed to process input event:', error);
      }
    } else {
      // Unknown message type
      console.warn('[RemoteSession] Unknown data channel message type:', message.type);
    }
  }

  /**
   * Create and send WebRTC offer (initiator only)
   */
  async createOffer(): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    if (this.role !== 'initiator') {
      throw new Error('Only initiator can create offer');
    }

    console.log('[RemoteSession] Creating WebRTC offer');

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);

    // Send offer to other peer via signaling
    this.onSignalingMessage({
      session_id: this.sessionId,
      offer: {
        sdp: offer.sdp || '',
        config: {
          enable_video: true,
          enable_audio: false, // Phase 3+ for audio
          enable_control: true,
          video_quality: 'high',
        },
      },
    });

    console.log('[RemoteSession] Offer sent');
  }

  /**
   * Handle incoming WebRTC offer (target only)
   */
  async handleOffer(sdp: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    if (this.role !== 'target') {
      throw new Error('Only target can handle offer');
    }

    console.log('[RemoteSession] Received offer, creating answer');

    await this.peerConnection.setRemoteDescription({
      type: 'offer',
      sdp,
    });

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Send answer to other peer via signaling
    this.onSignalingMessage({
      session_id: this.sessionId,
      answer: {
        sdp: answer.sdp || '',
      },
    });

    console.log('[RemoteSession] Answer sent');
  }

  /**
   * Handle incoming WebRTC answer (initiator only)
   */
  async handleAnswer(sdp: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    if (this.role !== 'initiator') {
      throw new Error('Only initiator can handle answer');
    }

    console.log('[RemoteSession] Received answer');

    await this.peerConnection.setRemoteDescription({
      type: 'answer',
      sdp,
    });

    console.log('[RemoteSession] Remote description set');
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleICECandidate(candidate: string, sdpMid: string, sdpMLineIndex: number): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[RemoteSession] Adding ICE candidate');

    try {
      await this.peerConnection.addIceCandidate({
        candidate,
        sdpMid,
        sdpMLineIndex,
      });
    } catch (error) {
      console.error('[RemoteSession] Failed to add ICE candidate:', error);
    }
  }

  /**
   * Send data via data channel
   */
  sendData(data: any): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[RemoteSession] Data channel not open');
      return false;
    }

    try {
      this.dataChannel.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[RemoteSession] Failed to send data:', error);
      return false;
    }
  }

  /**
   * Send input event (initiator only)
   */
  sendInputEvent(event: InputEvent): boolean {
    if (this.role !== 'initiator') {
      console.warn('[RemoteSession] Only initiator can send input events');
      return false;
    }

    return this.sendData(event);
  }

  /**
   * Send mouse event (initiator convenience method)
   */
  sendMouseEvent(
    event: 'move' | 'down' | 'up' | 'click' | 'double_click' | 'scroll',
    x: number,
    y: number,
    button?: 'left' | 'right' | 'middle',
    deltaX?: number,
    deltaY?: number
  ): boolean {
    return this.sendInputEvent(createMouseEvent(event, x, y, button, deltaX, deltaY));
  }

  /**
   * Send keyboard event (initiator convenience method)
   */
  sendKeyboardEvent(
    event: 'down' | 'up' | 'tap' | 'type',
    key: string,
    modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean },
    text?: string
  ): boolean {
    return this.sendInputEvent(createKeyboardEvent(event, key, modifiers, text));
  }

  /**
   * Enable or disable remote control (initiator)
   */
  setRemoteControlEnabled(enabled: boolean): boolean {
    if (this.role !== 'initiator') {
      console.warn('[RemoteSession] Only initiator can control remote input');
      return false;
    }

    const action = enabled ? 'enable_control' : 'disable_control';
    return this.sendInputEvent(createControlEvent(action));
  }

  /**
   * Enable or disable local control (target)
   */
  setLocalControlEnabled(enabled: boolean): void {
    if (this.role === 'target' && this.inputHandler) {
      this.inputHandler.setControlEnabled(enabled);
    }
  }

  /**
   * Update remote screen dimensions (target)
   */
  updateScreenDimensions(dimensions: ScreenDimensions): void {
    if (this.role === 'target' && this.inputHandler) {
      this.inputHandler.updateDimensions(dimensions);
    }

    // Notify initiator of dimension change
    this.sendData({
      type: 'screen_dimensions',
      dimensions,
    });
  }

  /**
   * Get current screen dimensions (target)
   */
  getScreenDimensions(): ScreenDimensions | null {
    if (this.role === 'target' && this.inputHandler) {
      return this.inputHandler.getDimensions();
    }
    return null;
  }

  /**
   * Check if input injection is available (target)
   */
  isInputInjectionAvailable(): boolean {
    if (this.role === 'target' && this.inputHandler) {
      return this.inputHandler.isAvailable();
    }
    return false;
  }

  /**
   * Handle local clipboard change and send to remote
   */
  private handleLocalClipboardChange(content: ClipboardContent): void {
    if (!this.clipboardSyncEnabled) {
      return;
    }

    console.log('[RemoteSession] Local clipboard changed, syncing to remote');

    // Send clipboard content to remote peer
    this.sendInputEvent(createClipboardEvent('set', content.text));
  }

  /**
   * Enable clipboard synchronization
   */
  enableClipboardSync(): void {
    if (!this.clipboardMonitor) {
      console.warn('[RemoteSession] Clipboard monitor not available');
      return;
    }

    this.clipboardSyncEnabled = true;
    this.clipboardMonitor.start();
    console.log('[RemoteSession] Clipboard sync enabled');
  }

  /**
   * Disable clipboard synchronization
   */
  disableClipboardSync(): void {
    if (!this.clipboardMonitor) {
      return;
    }

    this.clipboardSyncEnabled = false;
    this.clipboardMonitor.stop();
    console.log('[RemoteSession] Clipboard sync disabled');
  }

  /**
   * Check if clipboard sync is enabled
   */
  isClipboardSyncEnabled(): boolean {
    return this.clipboardSyncEnabled && this.clipboardMonitor?.isMonitoring() === true;
  }

  /**
   * Get current clipboard content
   */
  async getClipboardContent(): Promise<string> {
    if (!this.clipboardMonitor) {
      throw new Error('Clipboard monitor not available');
    }

    return this.clipboardMonitor.getContent();
  }

  /**
   * Set clipboard content
   */
  async setClipboardContent(text: string): Promise<void> {
    if (!this.clipboardMonitor) {
      throw new Error('Clipboard monitor not available');
    }

    await this.clipboardMonitor.writeClipboard(text);
  }

  /**
   * Send a file to remote peer
   */
  async sendFile(filePath: string): Promise<string> {
    if (!this.fileTransferManager) {
      throw new Error('File transfer manager not available');
    }

    return this.fileTransferManager.sendFile(filePath);
  }

  /**
   * Get file transfer by ID
   */
  getFileTransfer(transferId: string) {
    if (!this.fileTransferManager) {
      return null;
    }

    return this.fileTransferManager.getTransfer(transferId);
  }

  /**
   * Get all file transfers
   */
  getAllFileTransfers() {
    if (!this.fileTransferManager) {
      return [];
    }

    return this.fileTransferManager.getAllTransfers();
  }

  /**
   * Get active file transfers
   */
  getActiveFileTransfers() {
    if (!this.fileTransferManager) {
      return [];
    }

    return this.fileTransferManager.getActiveTransfers();
  }

  /**
   * Pause a file transfer
   */
  pauseFileTransfer(transferId: string): void {
    if (this.fileTransferManager) {
      this.fileTransferManager.pauseTransfer(transferId);
    }
  }

  /**
   * Resume a file transfer
   */
  resumeFileTransfer(transferId: string): void {
    if (this.fileTransferManager) {
      this.fileTransferManager.resumeTransfer(transferId);
    }
  }

  /**
   * Cancel a file transfer
   */
  cancelFileTransfer(transferId: string): void {
    if (this.fileTransferManager) {
      this.fileTransferManager.cancelTransfer(transferId);
    }
  }

  /**
   * Monitor connection quality
   */
  private async monitorQuality(): Promise<void> {
    if (!this.peerConnection) return;

    setInterval(async () => {
      if (this.peerConnection?.connectionState === 'connected') {
        const quality = await monitorConnectionQuality(this.peerConnection);
        if (quality) {
          console.log('[RemoteSession] Connection quality:', quality);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Close the peer connection
   */
  close(): void {
    console.log('[RemoteSession] Closing peer connection');

    // Stop clipboard monitoring
    if (this.clipboardMonitor) {
      this.clipboardMonitor.stop();
      this.clipboardMonitor.removeAllListeners();
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Send disconnect message
    this.onSignalingMessage({
      session_id: this.sessionId,
      disconnect: {
        reason: 'Connection closed by user',
      },
    });
  }

  /**
   * Get connection state
   */
  getState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  /**
   * Check if connection is established
   */
  isConnected(): boolean {
    return this.peerConnection?.connectionState === 'connected';
  }
}
