/**
 * Input event protocol for remote control via WebRTC data channel
 * Defines message format for mouse, keyboard, and special key events
 */

/**
 * Mouse button types
 */
export type MouseButton = 'left' | 'right' | 'middle';

/**
 * Mouse event types
 */
export type MouseEventType = 'move' | 'down' | 'up' | 'click' | 'double_click' | 'scroll';

/**
 * Keyboard modifier keys
 */
export interface KeyModifiers {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command on Mac, Windows key on Windows
}

/**
 * Mouse input event
 */
export interface MouseInputEvent {
  type: 'mouse';
  event: MouseEventType;
  x: number; // Normalized coordinates (0-1)
  y: number; // Normalized coordinates (0-1)
  button?: MouseButton;
  deltaX?: number; // For wheel events
  deltaY?: number; // For wheel events
  timestamp: number;
}

/**
 * Keyboard event types
 */
export type KeyboardEventType = 'down' | 'up' | 'tap' | 'type';

/**
 * Keyboard input event
 */
export interface KeyboardInputEvent {
  type: 'keyboard';
  event: KeyboardEventType;
  key: string; // Key value (e.g., 'a', 'Enter', 'ArrowUp')
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  text?: string; // For 'type' events
  timestamp: number;
}

/**
 * Special key combination (Ctrl-Alt-Del, etc.)
 */
export interface SpecialKeyEvent {
  type: 'special_key';
  combination: 'ctrl-alt-del' | 'cmd-opt-esc' | 'alt-tab' | 'alt-f4' | 'cmd-tab';
  timestamp: number;
}

/**
 * Clipboard sync event
 */
export interface ClipboardEvent {
  type: 'clipboard';
  action: 'get' | 'set';
  data?: string;
  format?: 'text' | 'html' | 'rtf';
  timestamp: number;
}

/**
 * Input control event (block/unblock local input)
 */
export interface InputControlEvent {
  type: 'control';
  action: 'enable_control' | 'disable_control' | 'block_local_input' | 'unblock_local_input';
  timestamp: number;
}

/**
 * Union type for all input events
 */
export type InputEvent =
  | MouseInputEvent
  | KeyboardInputEvent
  | SpecialKeyEvent
  | ClipboardEvent
  | InputControlEvent;

/**
 * Validate input event
 */
export function validateInputEvent(event: any): event is InputEvent {
  if (!event || typeof event !== 'object') {
    return false;
  }

  if (!event.type || !event.timestamp) {
    return false;
  }

  switch (event.type) {
    case 'mouse':
      return (
        typeof event.x === 'number' &&
        typeof event.y === 'number' &&
        event.x >= 0 &&
        event.x <= 1 &&
        event.y >= 0 &&
        event.y <= 1
      );
    case 'keyboard':
      return typeof event.key === 'string';
    case 'special_key':
      return typeof event.combination === 'string';
    case 'clipboard':
      return typeof event.action === 'string';
    case 'control':
      return typeof event.action === 'string';
    default:
      return false;
  }
}

/**
 * Create mouse event
 */
export function createMouseEvent(
  eventType: MouseEventType,
  x: number,
  y: number,
  button?: MouseButton,
  deltaX?: number,
  deltaY?: number
): MouseInputEvent {
  return {
    type: 'mouse',
    event: eventType,
    x: Math.max(0, Math.min(1, x)), // Clamp to 0-1
    y: Math.max(0, Math.min(1, y)),
    button,
    deltaX,
    deltaY,
    timestamp: Date.now(),
  };
}

/**
 * Create keyboard event
 */
export function createKeyboardEvent(
  eventType: KeyboardEventType,
  key: string,
  modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean },
  text?: string
): KeyboardInputEvent {
  return {
    type: 'keyboard',
    event: eventType,
    key,
    ctrl: modifiers?.ctrl,
    shift: modifiers?.shift,
    alt: modifiers?.alt,
    meta: modifiers?.meta,
    text,
    timestamp: Date.now(),
  };
}

/**
 * Create special key event
 */
export function createSpecialKeyEvent(
  combination: SpecialKeyEvent['combination']
): SpecialKeyEvent {
  return {
    type: 'special_key',
    combination,
    timestamp: Date.now(),
  };
}

/**
 * Create clipboard event
 */
export function createClipboardEvent(
  action: 'get' | 'set',
  data?: string,
  format: 'text' | 'html' | 'rtf' = 'text'
): ClipboardEvent {
  return {
    type: 'clipboard',
    action,
    data,
    format,
    timestamp: Date.now(),
  };
}

/**
 * Create input control event
 */
export function createInputControlEvent(
  action: InputControlEvent['action']
): InputControlEvent {
  return {
    type: 'control',
    action,
    timestamp: Date.now(),
  };
}

/**
 * Alias for createInputControlEvent
 */
export const createControlEvent = createInputControlEvent;

/**
 * Serialize input event for transmission
 */
export function serializeInputEvent(event: InputEvent): string {
  return JSON.stringify(event);
}

/**
 * Deserialize input event from transmission
 */
export function deserializeInputEvent(data: string | any): InputEvent | null {
  try {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    if (validateInputEvent(event)) {
      return event as InputEvent;
    }
    return null;
  } catch (error) {
    console.error('[InputProtocol] Failed to deserialize event:', error);
    return null;
  }
}
