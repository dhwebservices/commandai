/**
 * Clipboard Module
 *
 * Provides cross-platform clipboard monitoring and synchronization.
 * Detects clipboard changes in real-time and emits events.
 *
 * Usage:
 *   import { ClipboardMonitor } from './clipboard.js';
 *
 *   const monitor = new ClipboardMonitor({ enabled: true });
 *   monitor.on('change', (content) => {
 *     console.log('Clipboard changed:', content.text);
 *   });
 */

export {
  ClipboardMonitor,
  ClipboardContent,
  ClipboardMonitorOptions,
  isClipboardSupported,
  getClipboardRequirements,
} from './clipboard-monitor.js';
