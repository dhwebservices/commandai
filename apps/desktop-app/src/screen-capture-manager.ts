import { desktopCapturer, BrowserWindow } from 'electron';

export interface ScreenSource {
  id: string;
  name: string;
  thumbnailURL?: string;
}

/**
 * ScreenCaptureManager handles screen capture using Electron's desktopCapturer API
 * Provides MediaStream for WebRTC peer connections
 */
export class ScreenCaptureManager {
  private captureWindows: Map<string, BrowserWindow> = new Map();
  private activeCaptures: Map<string, ScreenSource> = new Map();

  /**
   * Get list of available screen sources (displays and windows)
   */
  async getScreenSources(): Promise<ScreenSource[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 150, height: 150 },
      });

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnailURL: source.thumbnail.toDataURL(),
      }));
    } catch (error) {
      console.error('[ScreenCaptureManager] Failed to get sources:', error);
      throw error;
    }
  }

  /**
   * Start screen capture for a specific source
   * Creates a hidden window that captures the screen and provides the MediaStream
   */
  async startCapture(sessionId: string, sourceId?: string): Promise<void> {
    if (this.captureWindows.has(sessionId)) {
      console.warn('[ScreenCaptureManager] Capture already active for session:', sessionId);
      return;
    }

    // Get sources
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 }, // We don't need thumbnails here
    });

    // Use specified source or default to first screen
    const source = sourceId
      ? sources.find((s) => s.id === sourceId)
      : sources.find((s) => s.name.includes('Screen') || s.name.includes('Display')) || sources[0];

    if (!source) {
      throw new Error('No screen source available');
    }

    this.activeCaptures.set(sessionId, {
      id: source.id,
      name: source.name,
    });

    console.log('[ScreenCaptureManager] Started capture for session:', sessionId, 'source:', source.name);
  }

  /**
   * Get the source ID for a capture session (to be used by renderer process)
   */
  getCaptureSource(sessionId: string): ScreenSource | undefined {
    return this.activeCaptures.get(sessionId);
  }

  /**
   * Stop screen capture for a session
   */
  async stopCapture(sessionId: string): Promise<void> {
    const window = this.captureWindows.get(sessionId);
    if (window && !window.isDestroyed()) {
      window.close();
    }
    this.captureWindows.delete(sessionId);
    this.activeCaptures.delete(sessionId);

    console.log('[ScreenCaptureManager] Stopped capture for session:', sessionId);
  }

  /**
   * Cleanup all captures
   */
  cleanup(): void {
    for (const sessionId of this.captureWindows.keys()) {
      this.stopCapture(sessionId);
    }
  }
}
