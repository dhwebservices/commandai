import { FileExecutor } from "./executors/file-executor";
import { SystemExecutor } from "./executors/system-executor";
import { ProcessExecutor } from "./executors/process-executor";
import { NetworkExecutor } from "./executors/network-executor";

export interface Intent {
  id: string;
  tenantId: string;
  capabilityId: string;
  parameters: Record<string, any>;
  reasoning: string;
  requestedBy: string;
  createdAt: string;
}

export interface ActionResult {
  intentId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export class DesktopAgent {
  private fileExecutor = new FileExecutor();
  private systemExecutor = new SystemExecutor();
  private processExecutor = new ProcessExecutor();
  private networkExecutor = new NetworkExecutor();

  async executeIntent(intent: Intent): Promise<ActionResult> {
    const startedAt = new Date().toISOString();

    try {
      console.log(`[Agent] Executing intent ${intent.id}: ${intent.capabilityId}`);
      console.log(`[Agent] Reasoning: ${intent.reasoning}`);
      console.log(`[Agent] Parameters:`, JSON.stringify(intent.parameters));

      const result = await this.executeCapability(intent.capabilityId, intent.parameters);

      console.log(`[Agent] Execution completed for ${intent.id}`);
      console.log(`[Agent] Result type:`, typeof result);
      console.log(`[Agent] Result is array:`, Array.isArray(result));
      console.log(`[Agent] Result length:`, Array.isArray(result) ? result.length : 'N/A');
      console.log(`[Agent] Result preview:`, JSON.stringify(result).substring(0, 200));

      const completedAt = new Date().toISOString();

      return {
        intentId: intent.id,
        status: "completed",
        result,
        startedAt,
        completedAt,
      };
    } catch (error: any) {
      const completedAt = new Date().toISOString();

      console.error(`[Agent] Failed to execute intent ${intent.id}:`, error);

      return {
        intentId: intent.id,
        status: "failed",
        error: error.message,
        startedAt,
        completedAt,
      };
    }
  }

  private async executeCapability(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    // Route to appropriate executor based on capability prefix
    const [category] = capabilityId.split(".");

    switch (category) {
      case "file":
      case "directory":
      case "text":
        return await this.fileExecutor.execute(capabilityId, parameters);

      case "system":
        return await this.systemExecutor.execute(capabilityId, parameters);

      case "process":
      case "app":
      case "window":
        return await this.processExecutor.execute(capabilityId, parameters);

      case "network":
      case "browser":
        return await this.networkExecutor.execute(capabilityId, parameters);

      case "clipboard":
        return await this.executeClipboard(capabilityId, parameters);

      case "screenshot":
        return await this.executeScreenshot(capabilityId, parameters);

      default:
        throw new Error(`Unknown capability category: ${category}`);
    }
  }

  private async executeClipboard(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    const { spawn } = await import("child_process");
    const { promisify } = await import("util");
    const { exec } = await import("child_process");
    const execAsync = promisify(exec);

    if (capabilityId === "clipboard.read") {
      if (process.platform === "darwin") {
        const { stdout } = await execAsync("pbpaste");
        return { text: stdout };
      } else if (process.platform === "win32") {
        const { stdout } = await execAsync("powershell Get-Clipboard");
        return { text: stdout };
      } else {
        const { stdout } = await execAsync("xclip -selection clipboard -o");
        return { text: stdout };
      }
    } else if (capabilityId === "clipboard.write") {
      // FIX: Use spawn to avoid command injection
      if (process.platform === "darwin") {
        const pbcopy = spawn("pbcopy");
        pbcopy.stdin.write(parameters.text);
        pbcopy.stdin.end();
        await new Promise((resolve, reject) => {
          pbcopy.on("close", resolve);
          pbcopy.on("error", reject);
        });
      } else if (process.platform === "win32") {
        // Escape single quotes for PowerShell
        const escapedText = parameters.text.replace(/'/g, "''");
        await execAsync(`powershell Set-Clipboard -Value '${escapedText}'`);
      } else {
        const xclip = spawn("xclip", ["-selection", "clipboard"]);
        xclip.stdin.write(parameters.text);
        xclip.stdin.end();
        await new Promise((resolve, reject) => {
          xclip.on("close", resolve);
          xclip.on("error", reject);
        });
      }
      return { success: true };
    }

    throw new Error(`Unknown clipboard capability: ${capabilityId}`);
  }

  private async executeScreenshot(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    const { spawn } = await import("child_process");
    const path = await import("path");

    if (capabilityId === "screenshot.capture") {
      // FIX: Validate path contains no shell metacharacters
      if (/[;&|$`<>(){}[\]!\\]/.test(parameters.path)) {
        throw new Error('Invalid characters in path');
      }

      // Validate path is absolute
      if (!path.isAbsolute(parameters.path)) {
        throw new Error('Path must be absolute');
      }

      if (process.platform === "darwin") {
        // Use spawn with array args to avoid injection
        const screencapture = spawn("screencapture", ["-x", parameters.path]);
        await new Promise((resolve, reject) => {
          screencapture.on("close", (code) => {
            if (code === 0) resolve(null);
            else reject(new Error(`screencapture exited with code ${code}`));
          });
          screencapture.on("error", reject);
        });
      } else if (process.platform === "win32") {
        // For Windows, use a more secure PowerShell approach
        const escapedPath = parameters.path.replace(/'/g, "''");
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);

        await execAsync(
          `powershell Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $screen = [System.Windows.Forms.Screen]::PrimaryScreen; $bounds = $screen.Bounds; $bitmap = New-Object System.Drawing.Bitmap $bounds.Width,$bounds.Height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.Location,[System.Drawing.Point]::Empty,$bounds.Size); $bitmap.Save('${escapedPath}'); $bitmap.Dispose(); $graphics.Dispose()`,
        );
      } else {
        // Linux: use spawn
        const scrot = spawn("scrot", [parameters.path]);
        await new Promise((resolve, reject) => {
          scrot.on("close", (code) => {
            if (code === 0) resolve(null);
            else reject(new Error(`scrot exited with code ${code}`));
          });
          scrot.on("error", reject);
        });
      }
      return { success: true, path: parameters.path };
    }

    throw new Error(`Unknown screenshot capability: ${capabilityId}`);
  }

  getCapabilities(): string[] {
    return [
      // File capabilities
      "file.read",
      "file.write",
      "file.append",
      "file.delete",
      "file.move",
      "file.copy",
      "file.list",
      "file.search",
      "file.get_info",
      "file.set_permissions",
      "directory.create",
      "directory.delete",
      // System capabilities
      "system.cpu.usage",
      "system.memory.usage",
      "system.disk.usage",
      "system.network.interfaces",
      "system.info",
      "system.uptime",
      "system.shutdown",
      "system.restart",
      "system.sleep",
      // Process capabilities
      "process.list",
      "process.get_info",
      "process.kill",
      "process.start",
      "app.launch",
      "app.quit",
      "app.list",
      "app.list_running",
      // Network capabilities
      "network.ping",
      "network.dns_lookup",
      "network.port_check",
      "network.download",
      "network.get_connections",
      // Clipboard
      "clipboard.read",
      "clipboard.write",
      // Screenshot
      "screenshot.capture",
    ];
  }

  // FIX: Per-session signaling callbacks instead of global
  private signalHandlers: Map<string, (message: any) => void> = new Map();

  // Remote session methods (stubs for desktop-app agent)
  getActiveRemoteSessions(): string[] {
    // This agent doesn't manage remote sessions directly
    // Remote sessions are handled by the main process and desktop-agent
    return [];
  }

  setRemoteSignalingCallback(callback: ((message: any) => void) | null): void {
    // Deprecated: Use addRemoteSignalingCallback instead
    console.warn('[Agent] setRemoteSignalingCallback is deprecated, use add/remove per session');
  }

  addRemoteSignalingCallback(sessionId: string, callback: (message: any) => void): void {
    this.signalHandlers.set(sessionId, callback);
    console.log(`[Agent] Added signaling handler for session ${sessionId}`);
  }

  removeRemoteSignalingCallback(sessionId: string): void {
    this.signalHandlers.delete(sessionId);
    console.log(`[Agent] Removed signaling handler for session ${sessionId}`);
  }

  handleRemoteSignalingMessage(message: any): void {
    const sessionId = message.sessionId || message.session_id;
    const handler = this.signalHandlers.get(sessionId);

    if (handler) {
      handler(message);
    } else {
      console.warn(`[Agent] No handler for session ${sessionId}`);
    }
  }
}
