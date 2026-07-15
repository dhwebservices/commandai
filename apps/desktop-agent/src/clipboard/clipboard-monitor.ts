/**
 * Clipboard monitoring for real-time sync
 * Polls clipboard content and emits change events
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface ClipboardContent {
  text: string;
  timestamp: number;
}

export interface ClipboardMonitorOptions {
  pollInterval?: number; // ms between checks (default: 500)
  enabled?: boolean; // start enabled (default: false)
}

/**
 * ClipboardMonitor detects clipboard changes and emits events
 *
 * Events:
 *   'change' - Emitted when clipboard content changes
 *   'error' - Emitted when clipboard read fails
 */
export class ClipboardMonitor extends EventEmitter {
  private pollInterval: number;
  private enabled: boolean;
  private intervalId: NodeJS.Timeout | null = null;
  private lastContent: string = '';
  private platform: string;

  constructor(options: ClipboardMonitorOptions = {}) {
    super();
    this.pollInterval = options.pollInterval ?? 500;
    this.enabled = options.enabled ?? false;
    this.platform = process.platform;

    if (this.enabled) {
      this.start();
    }
  }

  /**
   * Start monitoring clipboard
   */
  start(): void {
    if (this.intervalId) {
      console.warn('[ClipboardMonitor] Already monitoring');
      return;
    }

    this.enabled = true;
    console.log('[ClipboardMonitor] Started monitoring');

    // Initial read
    this.checkClipboard();

    // Poll at interval
    this.intervalId = setInterval(() => {
      this.checkClipboard();
    }, this.pollInterval);
  }

  /**
   * Stop monitoring clipboard
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.enabled = false;
    console.log('[ClipboardMonitor] Stopped monitoring');
  }

  /**
   * Check clipboard content and emit change if different
   */
  private async checkClipboard(): Promise<void> {
    try {
      const content = await this.readClipboard();

      if (content !== this.lastContent) {
        this.lastContent = content;
        this.emit('change', {
          text: content,
          timestamp: Date.now(),
        } as ClipboardContent);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Read clipboard content (platform-specific)
   */
  private async readClipboard(): Promise<string> {
    try {
      switch (this.platform) {
        case 'darwin':
          const { stdout: macOutput } = await execAsync('pbpaste');
          return macOutput;

        case 'win32':
          const { stdout: winOutput } = await execAsync(
            'powershell -command "Get-Clipboard"'
          );
          return winOutput;

        case 'linux':
          // Try xclip first, fallback to xsel
          try {
            const { stdout: linuxOutput } = await execAsync(
              'xclip -selection clipboard -o'
            );
            return linuxOutput;
          } catch {
            const { stdout: xselOutput } = await execAsync('xsel --clipboard --output');
            return xselOutput;
          }

        default:
          throw new Error(`Clipboard monitoring not supported on platform: ${this.platform}`);
      }
    } catch (error) {
      // Clipboard might be empty or contain non-text data
      return '';
    }
  }

  /**
   * Write to clipboard (platform-specific)
   */
  async writeClipboard(text: string): Promise<void> {
    // Escape text for shell
    const escapedText = text.replace(/'/g, "'\\''");

    try {
      switch (this.platform) {
        case 'darwin':
          await execAsync(`printf '%s' '${escapedText}' | pbcopy`);
          break;

        case 'win32':
          // Use PowerShell Set-Clipboard
          await execAsync(
            `powershell -command "Set-Clipboard -Value '${escapedText}'"`
          );
          break;

        case 'linux':
          try {
            await execAsync(`printf '%s' '${escapedText}' | xclip -selection clipboard`);
          } catch {
            await execAsync(`printf '%s' '${escapedText}' | xsel --clipboard --input`);
          }
          break;

        default:
          throw new Error(`Clipboard write not supported on platform: ${this.platform}`);
      }

      // Update last content to avoid triggering change event
      this.lastContent = text;
    } catch (error) {
      throw new Error(`Failed to write clipboard: ${error}`);
    }
  }

  /**
   * Get current clipboard content (one-time read)
   */
  async getContent(): Promise<string> {
    return this.readClipboard();
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.enabled && this.intervalId !== null;
  }

  /**
   * Change poll interval (requires restart if monitoring)
   */
  setPollInterval(interval: number): void {
    const wasMonitoring = this.isMonitoring();

    if (wasMonitoring) {
      this.stop();
    }

    this.pollInterval = interval;

    if (wasMonitoring) {
      this.start();
    }
  }
}

/**
 * Check if clipboard monitoring is supported on this platform
 */
export function isClipboardSupported(): boolean {
  return ['darwin', 'win32', 'linux'].includes(process.platform);
}

/**
 * Get platform-specific clipboard requirements
 */
export function getClipboardRequirements(): {
  platform: string;
  dependencies: string[];
  instructions: string;
} {
  const platform = process.platform;

  switch (platform) {
    case 'darwin':
      return {
        platform: 'macOS',
        dependencies: [],
        instructions: 'Built-in pbcopy/pbpaste commands',
      };

    case 'win32':
      return {
        platform: 'Windows',
        dependencies: ['PowerShell'],
        instructions: 'PowerShell Get-Clipboard/Set-Clipboard commands',
      };

    case 'linux':
      return {
        platform: 'Linux',
        dependencies: ['xclip or xsel'],
        instructions: 'Install xclip: sudo apt install xclip',
      };

    default:
      return {
        platform: 'Unknown',
        dependencies: [],
        instructions: 'Clipboard monitoring not supported',
      };
  }
}
