/**
 * Input Injection Module
 *
 * Provides cross-platform mouse and keyboard input injection for remote control.
 * Supports normalized coordinates for resolution-independent input events.
 *
 * Usage:
 *   import { InputHandler, createInputInjector } from './input-injection.js';
 *
 *   const injector = createInputInjector();
 *   const handler = new InputHandler(injector, { width: 1920, height: 1080 });
 *   handler.handleInputEvent(inputEvent);
 */

// Core types and interfaces
export { IInputInjector, createInputInjector, isInputInjectionSupported, getInputInjectionRequirements } from './input-injector.js';
export { CoordinateTranslator, MultiMonitorTranslator, ScreenDimensions } from './coordinate-translator.js';
export { InputHandler, InputHandlerOptions } from './input-handler.js';

// Protocol types
export {
  InputEvent,
  MouseInputEvent,
  KeyboardInputEvent,
  SpecialKeyEvent,
  ClipboardEvent,
  InputControlEvent,
  MouseEventType,
  KeyboardEventType,
  MouseButton,
  KeyModifiers,
  createMouseEvent,
  createKeyboardEvent,
  createSpecialKeyEvent,
  createClipboardEvent,
  createControlEvent,
  createInputControlEvent,
  serializeInputEvent,
  deserializeInputEvent,
} from './input-protocol.js';

// Platform-specific implementations (re-exported for testing/debugging)
export { MacOSInputInjector } from './macos-injector.js';
export { WindowsInputInjector } from './windows-injector.js';
export { LinuxInputInjector } from './linux-injector.js';
