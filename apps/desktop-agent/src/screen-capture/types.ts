/**
 * Screen capture types and interfaces for cross-platform implementation
 */

/**
 * Display/monitor information
 */
export interface Display {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isPrimary: boolean;
  scaleFactor: number;
}

/**
 * Screen capture frame
 */
export interface CaptureFrame {
  data: Buffer;
  width: number;
  height: number;
  format: 'RGBA' | 'BGRA' | 'RGB';
  timestamp: number;
}

/**
 * Capture quality settings
 */
export interface CaptureQuality {
  fps: number; // Frames per second (10-60)
  scale: number; // Scale factor (0.5 = half resolution, 1.0 = full)
  quality: number; // JPEG quality for encoding (1-100)
}

/**
 * Quality preset levels
 */
export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Get quality settings for a preset
 */
export function getQualitySettings(preset: QualityPreset): CaptureQuality {
  switch (preset) {
    case 'low':
      return { fps: 15, scale: 0.5, quality: 60 }; // 720p @ 15fps, ~500kbps
    case 'medium':
      return { fps: 30, scale: 0.75, quality: 75 }; // 1080p @ 30fps, ~2Mbps
    case 'high':
      return { fps: 60, scale: 1.0, quality: 85 }; // Full @ 60fps, ~4Mbps
    case 'ultra':
      return { fps: 60, scale: 1.0, quality: 95 }; // Full @ 60fps, ~8Mbps
    default:
      return { fps: 30, scale: 0.75, quality: 75 };
  }
}

/**
 * Capture statistics
 */
export interface CaptureStats {
  framesCaptured: number;
  framesDropped: number;
  avgCaptureTime: number; // milliseconds
  avgEncodeTime: number; // milliseconds
  currentFps: number;
}

/**
 * Screen capture interface - implemented by platform-specific capturer
 */
export interface IScreenCapture {
  /**
   * Get available displays/monitors
   */
  getDisplays(): Promise<Display[]>;

  /**
   * Start capturing from a specific display
   */
  startCapture(displayId: string, quality: CaptureQuality): Promise<void>;

  /**
   * Stop capturing
   */
  stopCapture(): Promise<void>;

  /**
   * Get the next captured frame
   */
  getNextFrame(): Promise<CaptureFrame | null>;

  /**
   * Update capture quality dynamically
   */
  updateQuality(quality: CaptureQuality): void;

  /**
   * Get capture statistics
   */
  getStats(): CaptureStats;

  /**
   * Check if currently capturing
   */
  isCapturing(): boolean;
}

/**
 * Cursor information for overlay
 */
export interface CursorInfo {
  x: number;
  y: number;
  visible: boolean;
  type: string; // 'arrow', 'hand', 'text', etc.
}

/**
 * Capture options
 */
export interface CaptureOptions {
  displayId?: string; // Specific display, or primary if not specified
  quality: QualityPreset;
  includeCursor: boolean;
  includeAudio: boolean; // Phase 3+ feature
}
