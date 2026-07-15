/**
 * Windows input injection implementation
 * Uses robotjs for cross-platform compatibility
 * Future: Native SendInput API for better performance
 */

import { IInputInjector } from './input-injector.js';
import { KeyModifiers } from './input-protocol.js';

export class WindowsInputInjector implements IInputInjector {
  private robot: any = null;
  private inputBlocked = false;

  constructor() {
    try {
      this.robot = require('robotjs');
      console.log('[WindowsInjector] robotjs loaded successfully');
    } catch (error) {
      console.warn('[WindowsInjector] robotjs not available - input injection disabled');
    }
  }

  moveMouse(x: number, y: number): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      this.robot.moveMouse(x, y);
    } catch (error) {
      console.error('[WindowsInjector] Failed to move mouse:', error);
    }
  }

  mouseDown(button: 'left' | 'right' | 'middle'): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      this.robot.mouseToggle('down', button);
    } catch (error) {
      console.error('[WindowsInjector] Failed to press mouse button:', error);
    }
  }

  mouseUp(button: 'left' | 'right' | 'middle'): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      this.robot.mouseToggle('up', button);
    } catch (error) {
      console.error('[WindowsInjector] Failed to release mouse button:', error);
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
      console.error('[WindowsInjector] Failed to click mouse:', error);
    }
  }

  mouseDoubleClick(button: 'left' | 'right' | 'middle', x?: number, y?: number): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      if (x !== undefined && y !== undefined) {
        this.moveMouse(x, y);
      }
      this.robot.mouseClick(button, true);
    } catch (error) {
      console.error('[WindowsInjector] Failed to double-click mouse:', error);
    }
  }

  mouseScroll(deltaX: number, deltaY: number): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      this.robot.scrollMouse(deltaX, -deltaY);
    } catch (error) {
      console.error('[WindowsInjector] Failed to scroll mouse:', error);
    }
  }

  keyDown(key: string, modifiers?: KeyModifiers): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      const robotKey = this.convertKeyToRobotJS(key);
      const robotModifiers = this.convertModifiersToRobotJS(modifiers);
      this.robot.keyToggle(robotKey, 'down', robotModifiers);
    } catch (error) {
      console.error('[WindowsInjector] Failed to press key:', error);
    }
  }

  keyUp(key: string, modifiers?: KeyModifiers): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      const robotKey = this.convertKeyToRobotJS(key);
      const robotModifiers = this.convertModifiersToRobotJS(modifiers);
      this.robot.keyToggle(robotKey, 'up', robotModifiers);
    } catch (error) {
      console.error('[WindowsInjector] Failed to release key:', error);
    }
  }

  keyTap(key: string, modifiers?: KeyModifiers): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      const robotKey = this.convertKeyToRobotJS(key);
      const robotModifiers = this.convertModifiersToRobotJS(modifiers);
      this.robot.keyTap(robotKey, robotModifiers);
    } catch (error) {
      console.error('[WindowsInjector] Failed to tap key:', error);
    }
  }

  typeString(text: string): void {
    if (!this.robot || this.inputBlocked) return;
    try {
      this.robot.typeString(text);
    } catch (error) {
      console.error('[WindowsInjector] Failed to type string:', error);
    }
  }

  sendSpecialKey(combination: string): void {
    if (!this.robot || this.inputBlocked) return;

    try {
      switch (combination) {
        case 'ctrl-alt-del':
          // Cannot be sent programmatically on Windows for security
          console.warn('[WindowsInjector] Ctrl-Alt-Del cannot be sent programmatically');
          break;
        case 'alt-tab':
          this.keyTap('tab', { alt: true });
          break;
        case 'alt-f4':
          this.keyTap('f4', { alt: true });
          break;
        default:
          console.warn('[WindowsInjector] Unknown special key combination:', combination);
      }
    } catch (error) {
      console.error('[WindowsInjector] Failed to send special key:', error);
    }
  }

  blockInput(): boolean {
    console.warn('[WindowsInjector] Input blocking not supported via robotjs');
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
      console.error('[WindowsInjector] Failed to get mouse position:', error);
      return { x: 0, y: 0 };
    }
  }

  isAvailable(): boolean {
    return this.robot !== null;
  }

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
      F1: 'f1', F2: 'f2', F3: 'f3', F4: 'f4',
      F5: 'f5', F6: 'f6', F7: 'f7', F8: 'f8',
      F9: 'f9', F10: 'f10', F11: 'f11', F12: 'f12',
    };

    return keyMap[key] || key.toLowerCase();
  }

  private convertModifiersToRobotJS(modifiers?: KeyModifiers): string[] {
    if (!modifiers) return [];

    const result: string[] = [];
    if (modifiers.ctrl) result.push('control');
    if (modifiers.shift) result.push('shift');
    if (modifiers.alt) result.push('alt');
    if (modifiers.meta) result.push('command'); // Windows key

    return result;
  }
}
