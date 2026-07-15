import { IScreenCapture } from './types.js';
import { MacOSScreenCapture } from './macos-capture.js';
import { WindowsScreenCapture } from './windows-capture.js';
import { LinuxScreenCapture } from './linux-capture.js';

// Re-export types
export { IScreenCapture };

/**
 * Create a platform-specific screen capture instance
 */
export function createScreenCapture(): IScreenCapture {
  const platform = process.platform;

  switch (platform) {
    case 'darwin':
      return new MacOSScreenCapture();
    case 'win32':
      return new WindowsScreenCapture();
    case 'linux':
      return new LinuxScreenCapture();
    default:
      throw new Error(`Unsupported platform for screen capture: ${platform}`);
  }
}

/**
 * Check if screen capture is supported on this platform
 */
export function isScreenCaptureSupported(): boolean {
  const platform = process.platform;
  return platform === 'darwin' || platform === 'win32' || platform === 'linux';
}

/**
 * Get platform-specific screen capture requirements/permissions
 */
export function getScreenCaptureRequirements(): {
  platform: string;
  permissions: string[];
  instructions: string;
} {
  const platform = process.platform;

  switch (platform) {
    case 'darwin':
      return {
        platform: 'macOS',
        permissions: ['Screen Recording'],
        instructions:
          'Grant Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording',
      };
    case 'win32':
      return {
        platform: 'Windows',
        permissions: [],
        instructions: 'No special permissions required',
      };
    case 'linux':
      return {
        platform: 'Linux',
        permissions: ['Display access'],
        instructions:
          'On Wayland, you may need to approve screen sharing via portal. On X11, no permissions needed.',
      };
    default:
      return {
        platform: 'Unknown',
        permissions: [],
        instructions: 'Platform not supported',
      };
  }
}
