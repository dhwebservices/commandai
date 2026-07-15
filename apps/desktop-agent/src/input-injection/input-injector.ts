/**
 * Input injector interface and factory
 * Platform-specific mouse and keyboard injection
 */

import { KeyModifiers } from './input-protocol.js';

/**
 * Input injector interface
 */
export interface IInputInjector {
  /**
   * Move mouse to absolute coordinates
   */
  moveMouse(x: number, y: number): void;

  /**
   * Press mouse button
   */
  mouseDown(button: 'left' | 'right' | 'middle'): void;

  /**
   * Release mouse button
   */
  mouseUp(button: 'left' | 'right' | 'middle'): void;

  /**
   * Click mouse button
   */
  mouseClick(button: 'left' | 'right' | 'middle', x?: number, y?: number): void;

  /**
   * Double-click mouse
   */
  mouseDoubleClick(button: 'left' | 'right' | 'middle', x?: number, y?: number): void;

  /**
   * Scroll mouse wheel
   */
  mouseScroll(deltaX: number, deltaY: number): void;

  /**
   * Press key down
   */
  keyDown(key: string, modifiers?: KeyModifiers): void;

  /**
   * Release key
   */
  keyUp(key: string, modifiers?: KeyModifiers): void;

  /**
   * Type a key (down + up)
   */
  keyTap(key: string, modifiers?: KeyModifiers): void;

  /**
   * Type a string of text
   */
  typeString(text: string): void;

  /**
   * Send special key combination (Ctrl-Alt-Del, etc.)
   */
  sendSpecialKey(combination: string): void;

  /**
   * Block local input (if supported)
   */
  blockInput(): boolean;

  /**
   * Unblock local input
   */
  unblockInput(): boolean;

  /**
   * Get current mouse position
   */
  getMousePosition(): { x: number; y: number };

  /**
   * Check if input injection is available
   */
  isAvailable(): boolean;
}

/**
 * Create platform-specific input injector
 */
export function createInputInjector(): IInputInjector {
  const platform = process.platform;

  switch (platform) {
    case 'darwin':
      // Lazy load to avoid import errors on other platforms
      const { MacOSInputInjector } = require('./macos-injector');
      return new MacOSInputInjector();
    case 'win32':
      const { WindowsInputInjector } = require('./windows-injector');
      return new WindowsInputInjector();
    case 'linux':
      const { LinuxInputInjector } = require('./linux-injector');
      return new LinuxInputInjector();
    default:
      throw new Error(`Input injection not supported on platform: ${platform}`);
  }
}

/**
 * Check if input injection is supported on this platform
 */
export function isInputInjectionSupported(): boolean {
  const platform = process.platform;
  return platform === 'darwin' || platform === 'win32' || platform === 'linux';
}

/**
 * Get platform-specific input injection requirements
 */
export function getInputInjectionRequirements(): {
  platform: string;
  permissions: string[];
  instructions: string;
} {
  const platform = process.platform;

  switch (platform) {
    case 'darwin':
      return {
        platform: 'macOS',
        permissions: ['Accessibility'],
        instructions:
          'Grant Accessibility permission in System Preferences > Security & Privacy > Privacy > Accessibility',
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
        permissions: ['input group membership'],
        instructions:
          'User must be in the input group. Run: sudo usermod -a -G input $USER',
      };
    default:
      return {
        platform: 'Unknown',
        permissions: [],
        instructions: 'Platform not supported',
      };
  }
}
