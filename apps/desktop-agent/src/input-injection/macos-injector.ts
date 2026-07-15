/**
 * macOS input injection implementation
 * Uses robotjs for cross-platform compatibility
 * Future: Native CGEventPost API for better performance
 */

import { IInputInjector } from './input-injector.js';
import { KeyModifiers } from './input-protocol.js';

export class MacOSInputInjector implements IInputInjector {
  private robot: any = null;
  private inputBlocked = false;

  constructor() {
    try {
      // Try to load robotjs (optional dependency)
      this.robot = require('robotjs');
      console.log('[MacOSInjector] robotjs loaded successfully');
    } catch (error) {
      console.warn('[MacOSInjector] robotjs not available - input injection disabled');
      console.warn('[MacOSInjector] Install with: npm install robotjs');
    }
  }

  moveMouse(x: number, y: number): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      this.robot.moveMouse(x, y);
    } catch (error) {
      console.error('[MacOSInjector] Failed to move mouse:', error);
    }
  }

  mouseDown(button: 'left' | 'right' | 'middle'): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      this.robot.mouseToggle('down', button);
    } catch (error) {
      console.error('[MacOSInjector] Failed to press mouse button:', error);
    }
  }

  mouseUp(button: 'left' | 'right' | 'middle'): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      this.robot.mouseToggle('up', button);
    } catch (error) {
      console.error('[MacOSInjector] Failed to release mouse button:', error);
    }
  }

  mouseClick(button: 'left' | 'right' | 'middle', x?: number, y?: number): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      if (x !== undefined && y !== undefined) {
        this.moveMouse(x, y);
      }
      this.robot.mouseClick(button);
    } catch (error) {
      console.error('[MacOSInjector] Failed to click mouse:', error);
    }
  }

  mouseDoubleClick(button: 'left' | 'right' | 'middle', x?: number, y?: number): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      if (x !== undefined && y !== undefined) {
        this.moveMouse(x, y);
      }
      this.robot.mouseClick(button, true); // true = double click
    } catch (error) {
      console.error('[MacOSInjector] Failed to double-click mouse:', error);
    }
  }

  mouseScroll(deltaX: number, deltaY: number): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      // robotjs expects magnitude parameter
      // Negative deltaY = scroll up, positive = scroll down
      this.robot.scrollMouse(deltaX, -deltaY);
    } catch (error) {
      console.error('[MacOSInjector] Failed to scroll mouse:', error);
    }
  }

  keyDown(key: string, modifiers?: KeyModifiers): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      const robotKey = this.convertKeyToRobotJS(key);
      const robotModifiers = this.convertModifiersToRobotJS(modifiers);
      this.robot.keyToggle(robotKey, 'down', robotModifiers);
    } catch (error) {
      console.error('[MacOSInjector] Failed to press key:', error);
    }
  }

  keyUp(key: string, modifiers?: KeyModifiers): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      const robotKey = this.convertKeyToRobotJS(key);
      const robotModifiers = this.convertModifiersToRobotJS(modifiers);
      this.robot.keyToggle(robotKey, 'up', robotModifiers);
    } catch (error) {
      console.error('[MacOSInjector] Failed to release key:', error);
    }
  }

  keyTap(key: string, modifiers?: KeyModifiers): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      const robotKey = this.convertKeyToRobotJS(key);
      const robotModifiers = this.convertModifiersToRobotJS(modifiers);
      this.robot.keyTap(robotKey, robotModifiers);
    } catch (error) {
      console.error('[MacOSInjector] Failed to tap key:', error);
    }
  }

  typeString(text: string): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      this.robot.typeString(text);
    } catch (error) {
      console.error('[MacOSInjector] Failed to type string:', error);
    }
  }

  sendSpecialKey(combination: string): void {
    if (!this.robot || this.inputBlocked) return;

    try {
      switch (combination) {
        case 'cmd-opt-esc':
          // Force Quit dialog on macOS
          this.keyTap('escape', { meta: true, alt: true });
          break;
        case 'cmd-tab':
          // Application switcher
          this.keyTap('tab', { meta: true });
          break;
        default:
          console.warn('[MacOSInjector] Unknown special key combination:', combination);
      }
    } catch (error) {
      console.error('[MacOSInjector] Failed to send special key:', error);
    }
  }

  blockInput(): boolean {
    // Note: robotjs doesn't support input blocking
    // This would require native CGEvent API integration
    console.warn('[MacOSInjector] Input blocking not supported');
    this.inputBlocked = true;
    return false;
  }

  unblockInput(): boolean {
    this.inputBlocked = false;
    return true;
  }

  getMousePosition(): { x: number; y: number } {
    if (!this.robot) {
      return { x: 0, y: 0 };
    }
    try {
      return this.robot.getMousePos();
    } catch (error) {
      console.error('[MacOSInjector] Failed to get mouse position:', error);
      return { x: 0, y: 0 };
    }
  }

  isAvailable(): boolean {
    return this.robot !== null;
  }

  /**
   * Convert browser key to robotjs key
   */
  private convertKeyToRobotJS(key: string): string {
    const keyMap: Record<string, string> = {
      Enter: 'enter',
      Escape: 'escape',
      Backspace: 'backspace',
      Tab: 'tab',
      ' ': 'space',
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Home: 'home',
      End: 'end',
      PageUp: 'pageup',
      PageDown: 'pagedown',
      Delete: 'delete',
      Insert: 'insert',
      CapsLock: 'capslock',
      NumLock: 'numlock',
      ScrollLock: 'scrolllock',
      Pause: 'pause',
      PrintScreen: 'printscreen',
      // Function keys
      F1: 'f1',
      F2: 'f2',
      F3: 'f3',
      F4: 'f4',
      F5: 'f5',
      F6: 'f6',
      F7: 'f7',
      F8: 'f8',
      F9: 'f9',
      F10: 'f10',
      F11: 'f11',
      F12: 'f12',
    };

    return keyMap[key] || key.toLowerCase();
  }

  /**
   * Convert modifiers to robotjs format
   */
  private convertModifiersToRobotJS(modifiers?: KeyModifiers): string[] {
    if (!modifiers) return [];

    const result: string[] = [];
    if (modifiers.ctrl) result.push('control');
    if (modifiers.shift) result.push('shift');
    if (modifiers.alt) result.push('alt');
    if (modifiers.meta) result.push('command'); // macOS uses 'command' for meta

    return result;
  }
}
