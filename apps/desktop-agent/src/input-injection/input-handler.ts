/**
 * Input handler coordinates input injection with coordinate translation
 * Processes incoming input events and dispatches to platform-specific injector
 */

import { IInputInjector } from './input-injector.js';
import { CoordinateTranslator, ScreenDimensions } from './coordinate-translator.js';
import {
  InputEvent,
  MouseInputEvent,
  KeyboardInputEvent,
  SpecialKeyEvent,
  ClipboardEvent,
  InputControlEvent,
} from './input-protocol.js';
import { ClipboardMonitor } from '../clipboard/index.js';

export interface InputHandlerOptions {
  enableInput?: boolean;
  enableClipboard?: boolean;
  logEvents?: boolean;
  clipboardMonitor?: ClipboardMonitor;
}

/**
 * InputHandler processes input events and executes them via platform injector
 */
export class InputHandler {
  private injector: IInputInjector;
  private translator: CoordinateTranslator;
  private options: Required<Omit<InputHandlerOptions, 'clipboardMonitor'>>;
  private clipboardMonitor: ClipboardMonitor | null;
  private controlEnabled = false;

  constructor(
    injector: IInputInjector,
    remoteDimensions: ScreenDimensions,
    options: InputHandlerOptions = {}
  ) {
    this.injector = injector;
    this.translator = new CoordinateTranslator(remoteDimensions);
    this.clipboardMonitor = options.clipboardMonitor ?? null;
    this.options = {
      enableInput: options.enableInput ?? true,
      enableClipboard: options.enableClipboard ?? true,
      logEvents: options.logEvents ?? false,
    };
  }

  /**
   * Handle an incoming input event
   */
  handleInputEvent(event: InputEvent): void {
    if (this.options.logEvents) {
      console.log('[InputHandler] Processing event:', event.type);
    }

    switch (event.type) {
      case 'mouse':
        this.handleMouseEvent(event as MouseInputEvent);
        break;
      case 'keyboard':
        this.handleKeyboardEvent(event as KeyboardInputEvent);
        break;
      case 'special_key':
        this.handleSpecialKeyEvent(event as SpecialKeyEvent);
        break;
      case 'clipboard':
        // Handle async clipboard operation without blocking
        this.handleClipboardEvent(event as ClipboardEvent).catch((error) => {
          console.error('[InputHandler] Clipboard operation failed:', error);
        });
        break;
      case 'control':
        this.handleControlEvent(event as InputControlEvent);
        break;
      default:
        console.warn('[InputHandler] Unknown event type:', (event as any).type);
    }
  }

  /**
   * Handle mouse input event
   */
  private handleMouseEvent(event: MouseInputEvent): void {
    if (!this.options.enableInput || !this.controlEnabled) {
      return;
    }

    // Convert normalized coordinates to absolute
    const { x, y } = this.translator.normalizedToAbsolute(event.x, event.y);
    const clampedCoords = this.translator.clampToScreen(x, y);

    switch (event.event) {
      case 'move':
        this.injector.moveMouse(clampedCoords.x, clampedCoords.y);
        break;

      case 'down':
        if (event.button) {
          this.injector.mouseDown(event.button);
        }
        break;

      case 'up':
        if (event.button) {
          this.injector.mouseUp(event.button);
        }
        break;

      case 'click':
        if (event.button) {
          this.injector.mouseClick(event.button, clampedCoords.x, clampedCoords.y);
        }
        break;

      case 'double_click':
        if (event.button) {
          this.injector.mouseDoubleClick(event.button, clampedCoords.x, clampedCoords.y);
        }
        break;

      case 'scroll':
        if (event.deltaX !== undefined && event.deltaY !== undefined) {
          this.injector.mouseScroll(event.deltaX, event.deltaY);
        }
        break;

      default:
        console.warn('[InputHandler] Unknown mouse event:', event.event);
    }
  }

  /**
   * Handle keyboard input event
   */
  private handleKeyboardEvent(event: KeyboardInputEvent): void {
    if (!this.options.enableInput || !this.controlEnabled) {
      return;
    }

    const modifiers = {
      ctrl: event.ctrl ?? false,
      shift: event.shift ?? false,
      alt: event.alt ?? false,
      meta: event.meta ?? false,
    };

    switch (event.event) {
      case 'down':
        this.injector.keyDown(event.key, modifiers);
        break;

      case 'up':
        this.injector.keyUp(event.key, modifiers);
        break;

      case 'tap':
        this.injector.keyTap(event.key, modifiers);
        break;

      case 'type':
        if (event.text) {
          this.injector.typeString(event.text);
        }
        break;

      default:
        console.warn('[InputHandler] Unknown keyboard event:', event.event);
    }
  }

  /**
   * Handle special key combination
   */
  private handleSpecialKeyEvent(event: SpecialKeyEvent): void {
    if (!this.options.enableInput || !this.controlEnabled) {
      return;
    }

    this.injector.sendSpecialKey(event.combination);
  }

  /**
   * Handle clipboard event
   */
  private async handleClipboardEvent(event: ClipboardEvent): Promise<void> {
    if (!this.options.enableClipboard) {
      return;
    }

    if (!this.clipboardMonitor) {
      console.warn('[InputHandler] Clipboard monitor not available');
      return;
    }

    try {
      switch (event.action) {
        case 'set':
          if (event.data) {
            await this.clipboardMonitor.writeClipboard(event.data);
            if (this.options.logEvents) {
              console.log('[InputHandler] Clipboard set:', event.data.substring(0, 50));
            }
          }
          break;

        case 'get':
          // Get action is typically handled by clipboard monitor events
          // This case is here for completeness
          const content = await this.clipboardMonitor.getContent();
          if (this.options.logEvents) {
            console.log('[InputHandler] Clipboard get:', content.substring(0, 50));
          }
          break;

        default:
          console.warn('[InputHandler] Unknown clipboard action:', event.action);
      }
    } catch (error) {
      console.error('[InputHandler] Failed to handle clipboard event:', error);
    }
  }

  /**
   * Handle control event (enable/disable input, block/unblock)
   */
  private handleControlEvent(event: InputControlEvent): void {
    console.log('[InputHandler] Control event:', event.action);

    switch (event.action) {
      case 'enable_control':
        this.controlEnabled = true;
        console.log('[InputHandler] Remote control enabled');
        break;

      case 'disable_control':
        this.controlEnabled = false;
        console.log('[InputHandler] Remote control disabled');
        break;

      case 'block_local_input':
        this.injector.blockInput();
        console.log('[InputHandler] Local input blocked');
        break;

      case 'unblock_local_input':
        this.injector.unblockInput();
        console.log('[InputHandler] Local input unblocked');
        break;

      default:
        console.warn('[InputHandler] Unknown control action:', event.action);
    }
  }

  /**
   * Update remote screen dimensions (e.g., on resolution change)
   */
  updateDimensions(dimensions: ScreenDimensions): void {
    this.translator.updateDimensions(dimensions);
    console.log('[InputHandler] Updated screen dimensions:', dimensions);
  }

  /**
   * Get current screen dimensions
   */
  getDimensions(): ScreenDimensions {
    return this.translator.getDimensions();
  }

  /**
   * Check if input injection is available
   */
  isAvailable(): boolean {
    return this.injector.isAvailable();
  }

  /**
   * Enable or disable remote control
   */
  setControlEnabled(enabled: boolean): void {
    this.controlEnabled = enabled;
    console.log('[InputHandler] Control enabled:', enabled);
  }

  /**
   * Check if remote control is enabled
   */
  isControlEnabled(): boolean {
    return this.controlEnabled;
  }

  /**
   * Get current mouse position
   */
  getMousePosition(): { x: number; y: number } {
    return this.injector.getMousePosition();
  }

  /**
   * Get normalized mouse position (0-1)
   */
  getNormalizedMousePosition(): { x: number; y: number } {
    const pos = this.injector.getMousePosition();
    return this.translator.absoluteToNormalized(pos.x, pos.y);
  }
}
