/**
 * Coordinate translation for remote input
 * Handles resolution differences between viewer and remote screen
 */

export interface ScreenDimensions {
  width: number;
  height: number;
}

/**
 * Coordinate translator handles conversion between normalized coordinates
 * and absolute screen coordinates
 */
export class CoordinateTranslator {
  private remoteWidth: number;
  private remoteHeight: number;

  constructor(remoteDimensions: ScreenDimensions) {
    this.remoteWidth = remoteDimensions.width;
    this.remoteHeight = remoteDimensions.height;
  }

  /**
   * Convert normalized coordinates (0-1) to absolute screen coordinates
   */
  normalizedToAbsolute(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.round(x * this.remoteWidth),
      y: Math.round(y * this.remoteHeight),
    };
  }

  /**
   * Convert absolute screen coordinates to normalized (0-1)
   */
  absoluteToNormalized(x: number, y: number): { x: number; y: number } {
    return {
      x: x / this.remoteWidth,
      y: y / this.remoteHeight,
    };
  }

  /**
   * Update remote screen dimensions
   */
  updateDimensions(dimensions: ScreenDimensions): void {
    this.remoteWidth = dimensions.width;
    this.remoteHeight = dimensions.height;
  }

  /**
   * Get current remote dimensions
   */
  getDimensions(): ScreenDimensions {
    return {
      width: this.remoteWidth,
      height: this.remoteHeight,
    };
  }

  /**
   * Clamp coordinates to screen bounds
   */
  clampToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(this.remoteWidth - 1, x)),
      y: Math.max(0, Math.min(this.remoteHeight - 1, y)),
    };
  }

  /**
   * Check if coordinates are within screen bounds
   */
  isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.remoteWidth && y >= 0 && y < this.remoteHeight;
  }

  /**
   * Calculate scale factor between two resolutions
   */
  static calculateScaleFactor(
    source: ScreenDimensions,
    target: ScreenDimensions
  ): { x: number; y: number } {
    return {
      x: target.width / source.width,
      y: target.height / source.height,
    };
  }

  /**
   * Scale coordinates from source to target resolution
   */
  static scaleCoordinates(
    x: number,
    y: number,
    source: ScreenDimensions,
    target: ScreenDimensions
  ): { x: number; y: number } {
    const scale = CoordinateTranslator.calculateScaleFactor(source, target);
    return {
      x: Math.round(x * scale.x),
      y: Math.round(y * scale.y),
    };
  }
}

/**
 * Multi-monitor coordinate translator
 * Handles coordinate translation across multiple displays
 */
export class MultiMonitorTranslator {
  private monitors: Map<string, { x: number; y: number; width: number; height: number }>;
  private currentMonitor: string | null = null;

  constructor() {
    this.monitors = new Map();
  }

  /**
   * Add a monitor
   */
  addMonitor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.monitors.set(id, { x, y, width, height });
    if (!this.currentMonitor) {
      this.currentMonitor = id;
    }
  }

  /**
   * Set current active monitor
   */
  setCurrentMonitor(id: string): boolean {
    if (this.monitors.has(id)) {
      this.currentMonitor = id;
      return true;
    }
    return false;
  }

  /**
   * Convert normalized coordinates to absolute for current monitor
   */
  normalizedToAbsolute(x: number, y: number): { x: number; y: number } | null {
    if (!this.currentMonitor) {
      return null;
    }

    const monitor = this.monitors.get(this.currentMonitor);
    if (!monitor) {
      return null;
    }

    return {
      x: monitor.x + Math.round(x * monitor.width),
      y: monitor.y + Math.round(y * monitor.height),
    };
  }

  /**
   * Find which monitor contains the given absolute coordinates
   */
  findMonitorForCoordinates(x: number, y: number): string | null {
    for (const [id, monitor] of this.monitors.entries()) {
      if (
        x >= monitor.x &&
        x < monitor.x + monitor.width &&
        y >= monitor.y &&
        y < monitor.y + monitor.height
      ) {
        return id;
      }
    }
    return null;
  }

  /**
   * Get dimensions of current monitor
   */
  getCurrentDimensions(): ScreenDimensions | null {
    if (!this.currentMonitor) {
      return null;
    }

    const monitor = this.monitors.get(this.currentMonitor);
    if (!monitor) {
      return null;
    }

    return {
      width: monitor.width,
      height: monitor.height,
    };
  }

  /**
   * Get all monitors
   */
  getAllMonitors(): Array<{ id: string; x: number; y: number; width: number; height: number }> {
    const monitors: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
    this.monitors.forEach((monitor, id) => {
      monitors.push({ id, ...monitor });
    });
    return monitors;
  }
}
