/**
 * Screen Capture Module
 * Cross-platform screen capture for remote desktop sessions
 */

export * from './types.js';
export * from './factory.js';
export * from './macos-capture.js';
export * from './windows-capture.js';
export * from './linux-capture.js';
export * from './stream-converter.js';
export * from './adaptive-quality.js';

// Re-export commonly used functions
export { createScreenCapture, isScreenCaptureSupported, getScreenCaptureRequirements } from './factory.js';
export { getQualitySettings } from './types.js';
