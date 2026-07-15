import {
  IScreenCapture,
  Display,
  CaptureFrame,
  CaptureQuality,
  CaptureStats,
} from './types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * macOS screen capture implementation
 * Uses screencapture command-line tool (built into macOS)
 * Future: Upgrade to ScreenCaptureKit native addon for better performance
 */
export class MacOSScreenCapture implements IScreenCapture {
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
  private lastFrameTime = 0;
  private currentFrame: CaptureFrame | null = null;
  private frameQueue: CaptureFrame[] = [];

  async getDisplays(): Promise<Display[]> {
    try {
      // Use system_profiler to get display information
      const { stdout } = await execAsync(
        'system_profiler SPDisplaysDataType -json'
      );
      const data = JSON.parse(stdout);

      const displays: Display[] = [];
      let displayIndex = 0;

      // Parse display information
      if (data.SPDisplaysDataType) {
        for (const gpu of data.SPDisplaysDataType) {
          if (gpu.spdisplays_ndrvs) {
            for (const display of gpu.spdisplays_ndrvs) {
              const resolution = display._spdisplays_resolution || '';
              const match = resolution.match(/(\d+)\s*x\s*(\d+)/);

              if (match) {
                displays.push({
                  id: `display-${displayIndex}`,
                  name: display._name || `Display ${displayIndex + 1}`,
                  width: parseInt(match[1]),
                  height: parseInt(match[2]),
                  x: 0,
                  y: 0,
                  isPrimary: displayIndex === 0,
                  scaleFactor: parseFloat(display._spdisplays_pixelresolution) || 1.0,
                });
                displayIndex++;
              }
            }
          }
        }
      }

      // Fallback: If no displays detected, return a default primary display
      if (displays.length === 0) {
        displays.push({
          id: 'display-0',
          name: 'Primary Display',
          width: 1920,
          height: 1080,
          x: 0,
          y: 0,
          isPrimary: true,
          scaleFactor: 1.0,
        });
      }

      return displays;
    } catch (error) {
      console.error('[MacOSCapture] Failed to get displays:', error);
      // Return default display as fallback
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
  }

  async startCapture(displayId: string, quality: CaptureQuality): Promise<void> {
    if (this.capturing) {
      throw new Error('Already capturing');
    }

    this.displayId = displayId;
    this.quality = quality;
    this.capturing = true;
    this.stats = {
      framesCaptured: 0,
      framesDropped: 0,
      avgCaptureTime: 0,
      avgEncodeTime: 0,
      currentFps: 0,
    };

    console.log('[MacOSCapture] Starting capture:', { displayId, quality });

    // Start capture loop
    const intervalMs = 1000 / quality.fps;
    this.captureInterval = setInterval(() => {
      this.captureFrame();
    }, intervalMs);

    // Initial capture
    await this.captureFrame();
  }

  async stopCapture(): Promise<void> {
    if (!this.capturing) {
      return;
    }

    console.log('[MacOSCapture] Stopping capture');

    this.capturing = false;
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    this.displayId = null;
    this.currentFrame = null;
    this.frameQueue = [];
  }

  async getNextFrame(): Promise<CaptureFrame | null> {
    if (this.frameQueue.length > 0) {
      return this.frameQueue.shift()!;
    }
    return null;
  }

  private async captureFrame(): Promise<void> {
    if (!this.capturing) return;

    const startTime = Date.now();

    try {
      // Use screencapture to take a screenshot
      // -x: no sound, -t: format (png), -C: no window shadow
      const tempFile = `/tmp/comandr-screen-${Date.now()}.png`;
      await execAsync(`screencapture -x -t png -C ${tempFile}`);

      // In production, we'd read the PNG, decode it, and create a CaptureFrame
      // For now, we'll simulate with metadata
      const frame: CaptureFrame = {
        data: Buffer.alloc(0), // Placeholder - would contain actual frame data
        width: 1920,
        height: 1080,
        format: 'RGBA',
        timestamp: Date.now(),
      };

      this.frameQueue.push(frame);
      this.stats.framesCaptured++;

      const captureTime = Date.now() - startTime;
      this.stats.avgCaptureTime =
        (this.stats.avgCaptureTime * (this.stats.framesCaptured - 1) + captureTime) /
        this.stats.framesCaptured;

      // Calculate current FPS
      const now = Date.now();
      if (this.lastFrameTime > 0) {
        const timeDiff = now - this.lastFrameTime;
        this.stats.currentFps = 1000 / timeDiff;
      }
      this.lastFrameTime = now;

      // Clean up temp file
      execAsync(`rm ${tempFile}`).catch(() => {});
    } catch (error) {
      console.error('[MacOSCapture] Failed to capture frame:', error);
      this.stats.framesDropped++;
    }
  }

  updateQuality(quality: CaptureQuality): void {
    this.quality = quality;

    // Restart capture loop with new frame rate
    if (this.capturing && this.captureInterval) {
      clearInterval(this.captureInterval);
      const intervalMs = 1000 / quality.fps;
      this.captureInterval = setInterval(() => {
        this.captureFrame();
      }, intervalMs);
    }

    console.log('[MacOSCapture] Quality updated:', quality);
  }

  getStats(): CaptureStats {
    return { ...this.stats };
  }

  isCapturing(): boolean {
    return this.capturing;
  }
}
