/**
 * Remote Session Executor
 * Handles remote desktop session capabilities
 */

import { RemoteSessionClient } from '../remote-session-client.js';
import { createScreenCapture, IScreenCapture } from '../screen-capture/factory.js';
import { ScreenStreamConverter } from '../screen-capture/stream-converter.js';
import { getQualitySettings } from '../screen-capture/types.js';
import * as os from 'os';

export class RemoteExecutor {
  private sessions: Map<string, RemoteSessionClient> = new Map();
  private screenCapture: IScreenCapture | null = null;
  private streamConverter: ScreenStreamConverter | null = null;
  private onSignalingMessage: ((message: any) => void) | null = null;

  constructor() {
    // Initialize screen capture
    try {
      this.screenCapture = createScreenCapture();
      console.log('[RemoteExecutor] Screen capture initialized');
    } catch (error) {
      console.error('[RemoteExecutor] Failed to initialize screen capture:', error);
    }
  }

  /**
   * Set signaling message callback (for sending messages to Agent Gateway)
   */
  setSignalingCallback(callback: ((message: any) => void) | null): void {
    this.onSignalingMessage = callback;
  }

  /**
   * Execute remote capability
   */
  async execute(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityId) {
      case 'remote.session.create':
        return await this.createSession(parameters as any);

      case 'remote.session.connect':
        return await this.connectSession(parameters as any);

      case 'remote.session.end':
        return await this.endSession(parameters as any);

      case 'remote.session.get_state':
        return this.getSessionState(parameters as any);

      case 'remote.control.enable':
        return this.enableControl(parameters as any);

      case 'remote.control.disable':
        return this.disableControl(parameters as any);

      case 'remote.screen.start_stream':
        return await this.startScreenStream(parameters as any);

      case 'remote.screen.stop_stream':
        return await this.stopScreenStream(parameters as any);

      case 'remote.input.send':
        return this.sendInput(parameters as any);

      case 'remote.file.send':
        return await this.sendFile(parameters as any);

      case 'remote.clipboard.sync_enable':
        return this.enableClipboardSync(parameters as any);

      case 'remote.clipboard.sync_disable':
        return this.disableClipboardSync(parameters as any);

      case 'remote.device.info':
        return await this.getDeviceInfo();

      default:
        throw new Error(`Unknown remote capability: ${capabilityId}`);
    }
  }

  /**
   * Create a new remote session
   */
  private async createSession(parameters: {
    sessionId: string;
    role: 'initiator' | 'target';
    targetDeviceId?: string;
  }): Promise<any> {
    const { sessionId, role } = parameters;

    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    // Get screen dimensions for target role
    let remoteDimensions;
    if (role === 'target' && this.screenCapture) {
      const displays = await this.screenCapture.getDisplays();
      if (displays.length > 0 && displays[0]) {
        remoteDimensions = {
          width: displays[0].width,
          height: displays[0].height,
        };
      }
    }

    // Create session client
    const session = new RemoteSessionClient(
      sessionId,
      role,
      (message: any) => {
        // Send signaling message to Agent Gateway
        if (this.onSignalingMessage) {
          this.onSignalingMessage({
            type: 'signaling',
            sessionId,
            ...message,
          });
        }
      },
      remoteDimensions,
      true, // Enable clipboard
      './downloads' // Download path
    );

    // Initialize WebRTC connection
    await session.init();

    this.sessions.set(sessionId, session);

    console.log('[RemoteExecutor] Session created:', sessionId, role);

    return {
      success: true,
      sessionId,
      role,
      state: session.getState(),
    };
  }

  /**
   * Connect to remote session (create offer or handle offer)
   */
  private async connectSession(parameters: {
    sessionId: string;
    offer?: string; // SDP offer (for target)
    answer?: string; // SDP answer (for initiator)
    iceCandidate?: any; // ICE candidate
  }): Promise<any> {
    const { sessionId, offer, answer, iceCandidate } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (offer) {
      // Target: Handle incoming offer and create answer
      await session.handleOffer(offer);
      console.log('[RemoteExecutor] Handled offer for session:', sessionId);
    } else if (answer) {
      // Initiator: Handle answer
      await session.handleAnswer(answer);
      console.log('[RemoteExecutor] Handled answer for session:', sessionId);
    } else if (iceCandidate) {
      // Handle ICE candidate
      await session.handleICECandidate(
        iceCandidate.candidate,
        iceCandidate.sdpMid,
        iceCandidate.sdpMLineIndex
      );
      console.log('[RemoteExecutor] Handled ICE candidate for session:', sessionId);
    } else {
      // Initiator: Create offer
      await session.createOffer();
      console.log('[RemoteExecutor] Created offer for session:', sessionId);
    }

    return {
      success: true,
      sessionId,
      state: session.getState(),
    };
  }

  /**
   * End a remote session
   */
  private async endSession(parameters: { sessionId: string }): Promise<any> {
    const { sessionId } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Stop screen streaming if active
    if (this.screenCapture) {
      await this.screenCapture.stopCapture();
    }

    // Close session
    session.close();
    this.sessions.delete(sessionId);

    console.log('[RemoteExecutor] Session ended:', sessionId);

    return {
      success: true,
      sessionId,
    };
  }

  /**
   * Get session state
   */
  private getSessionState(parameters: { sessionId: string }): any {
    const { sessionId } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      success: true,
      sessionId,
      state: session.getState(),
      connected: session.isConnected(),
    };
  }

  /**
   * Enable remote control
   */
  private enableControl(parameters: { sessionId: string }): any {
    const { sessionId } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.setLocalControlEnabled(true);

    return {
      success: true,
      sessionId,
    };
  }

  /**
   * Disable remote control
   */
  private disableControl(parameters: { sessionId: string }): any {
    const { sessionId } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.setLocalControlEnabled(false);

    return {
      success: true,
      sessionId,
    };
  }

  /**
   * Start screen streaming
   */
  private async startScreenStream(parameters: {
    sessionId: string;
    displayIndex?: number;
    quality?: 'low' | 'medium' | 'high' | 'ultra';
  }): Promise<any> {
    const { sessionId, displayIndex = 0, quality = 'medium' } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!this.screenCapture) {
      throw new Error('Screen capture not available');
    }

    // Get displays
    const displays = await this.screenCapture.getDisplays();
    if (displays.length === 0) {
      throw new Error('No displays available');
    }

    const display = displays[displayIndex] || displays[0];
    if (!display) {
      throw new Error('Display not found');
    }

    // Get quality settings
    const qualitySettings = getQualitySettings(quality);

    // Start capture
    await this.screenCapture.startCapture(display.id, qualitySettings);

    // Create stream converter
    this.streamConverter = new ScreenStreamConverter(this.screenCapture);

    // TODO: Wire stream to WebRTC peer connection
    // For now, just log that streaming started
    console.log('[RemoteExecutor] Screen streaming started:', sessionId, display);

    return {
      success: true,
      sessionId,
      display: {
        id: display.id,
        name: display.name,
        width: display.width,
        height: display.height,
      },
      quality: qualitySettings,
    };
  }

  /**
   * Stop screen streaming
   */
  private async stopScreenStream(parameters: { sessionId: string }): Promise<any> {
    const { sessionId } = parameters;

    if (this.screenCapture) {
      await this.screenCapture.stopCapture();
    }

    if (this.streamConverter) {
      this.streamConverter = null;
    }

    console.log('[RemoteExecutor] Screen streaming stopped:', sessionId);

    return {
      success: true,
      sessionId,
    };
  }

  /**
   * Send input event
   */
  private sendInput(parameters: {
    sessionId: string;
    eventType: string;
    eventData: any;
  }): any {
    const { sessionId, eventType, eventData } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Send input event via data channel
    const success = session.sendInputEvent(eventData);

    return {
      success,
      sessionId,
    };
  }

  /**
   * Send file
   */
  private async sendFile(parameters: {
    sessionId: string;
    filePath: string;
  }): Promise<any> {
    const { sessionId, filePath } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const transferId = await session.sendFile(filePath);

    return {
      success: true,
      sessionId,
      transferId,
    };
  }

  /**
   * Enable clipboard sync
   */
  private enableClipboardSync(parameters: { sessionId: string }): any {
    const { sessionId } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.enableClipboardSync();

    return {
      success: true,
      sessionId,
    };
  }

  /**
   * Disable clipboard sync
   */
  private disableClipboardSync(parameters: { sessionId: string }): any {
    const { sessionId } = parameters;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.disableClipboardSync();

    return {
      success: true,
      sessionId,
    };
  }

  /**
   * Get device information for registration
   */
  private async getDeviceInfo(): Promise<any> {
    const displays = this.screenCapture ? await this.screenCapture.getDisplays() : [];

    return {
      hostname: os.hostname(),
      osType: process.platform,
      osVersion: os.release(),
      capabilities: {
        screenCapture: this.screenCapture !== null,
        audioCapture: false, // TODO: Implement audio capture
        remoteControl: true,
        fileTransfer: true,
        clipboard: true,
      },
      deviceMetadata: {
        cpu: os.cpus()[0]?.model || 'Unknown',
        memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
        screens: displays.map((d: any) => ({
          id: d.id,
          name: d.name,
          width: d.width,
          height: d.height,
        })),
      },
    };
  }

  /**
   * Handle incoming signaling message
   */
  handleSignalingMessage(message: any): void {
    const { sessionId, offer, answer, ice_candidate } = message;

    if (!sessionId) {
      console.error('[RemoteExecutor] Signaling message missing sessionId');
      return;
    }

    // Route to session
    this.connectSession({
      sessionId,
      offer: offer?.sdp,
      answer: answer?.sdp,
      iceCandidate: ice_candidate,
    }).catch((error) => {
      console.error('[RemoteExecutor] Failed to handle signaling message:', error);
    });
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Cleanup all sessions
   */
  cleanup(): void {
    for (const sessionId of this.sessions.keys()) {
      this.endSession({ sessionId }).catch((error) => {
        console.error('[RemoteExecutor] Failed to end session:', sessionId, error);
      });
    }

    this.sessions.clear();
  }
}
