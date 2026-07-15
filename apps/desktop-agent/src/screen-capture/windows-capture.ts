import {
  IScreenCapture,
  Display,
  CaptureFrame,
  CaptureQuality,
  CaptureStats,
} from './types.js';

/**
 * Windows screen capture implementation
 * Uses Windows.Graphics.Capture API via native addon or screenshot tool
 * Future: Native addon for Graphics.Capture for better performance
 */
export class WindowsScreenCapture implements IScreenCapture {
  private capturing = false;
  private displayId: string | null = null;
  private quality: CaptureQuality = { fps: 30, scale: 1.0, quality: 75 };
  private captureInterval: NodeJS.Timeout | null = null;
  private stats: CaptureStats = {
    framesCaptured: 0,
    framesDropped: 0,
    avgCaptureTime: 0,
    avgEncodeTime: 0,
    currentFps: 0,
  };
  private frameQueue: CaptureFrame[] = [];

  async getDisplays(): Promise<Display[]> {
    // Phase 3: Return mock displays
    // Future: Query actual Windows display information
    return [
      {
        id: 'display-0',
        name: 'Primary Display',
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        isPrimary: true,
        scaleFactor: 1.0,
      },
    ];
  }

  async startCapture(displayId: string, quality: CaptureQuality): Promise<void> {
    if (this.capturing) {
      throw new Error('Already capturing');
    }

    this.displayId = displayId;
    this.quality = quality;
    this.capturing = true;

    console.log('[WindowsCapture] Starting capture:', { displayId, quality });

    // Start capture loop
    const intervalMs = 1000 / quality.fps;
    this.captureInterval = setInterval(() => {
      this.captureFrame();
    }, intervalMs);
  }

  async stopCapture(): Promise<void> {
    if (!this.capturing) return;

    console.log('[WindowsCapture] Stopping capture');
    this.capturing = false;

    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }

  async getNextFrame(): Promise<CaptureFrame | null> {
    if (this.frameQueue.length > 0) {
      return this.frameQueue.shift()!;
    }
    return null;
  }

  private async captureFrame(): Promise<void> {
    if (!this.capturing) return;

    // Phase 3: Simulated frame capture
    // Future: Actual Windows.Graphics.Capture implementation
    const frame: CaptureFrame = {
      data: Buffer.alloc(0),
      width: 1920,
      height: 1080,
      format: 'BGRA',
      timestamp: Date.now(),
    };

    this.frameQueue.push(frame);
    this.stats.framesCaptured++;
  }

  updateQuality(quality: CaptureQuality): void {
    this.quality = quality;

    if (this.capturing && this.captureInterval) {
      clearInterval(this.captureInterval);
      const intervalMs = 1000 / quality.fps;
      this.captureInterval = setInterval(() => {
        this.captureFrame();
      }, intervalMs);
    }
  }

  getStats(): CaptureStats {
    return { ...this.stats };
  }

  isCapturing(): boolean {
    return this.capturing;
  }
}
