import { FileExecutor } from "./executors/file-executor.js";
import { SystemExecutor } from "./executors/system-executor.js";
import { ProcessExecutor } from "./executors/process-executor.js";
import { NetworkExecutor } from "./executors/network-executor.js";
import { RemoteExecutor } from "./executors/remote-executor.js";

// Shell escape utility to prevent command injection
function shellEscape(arg: string): string {
  if (process.platform === "win32") {
    // Windows PowerShell escaping
    return `'${arg.replace(/'/g, "''")}'`;
  } else {
    // Unix shell escaping (bash, zsh)
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }
}

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
  private remoteExecutor = new RemoteExecutor();

  async executeIntent(intent: Intent): Promise<ActionResult> {
    const startedAt = new Date().toISOString();

    try {
      console.log(`[Agent] Executing intent ${intent.id}: ${intent.capabilityId}`);
      console.log(`[Agent] Reasoning: ${intent.reasoning}`);

      const result = await this.executeCapability(intent.capabilityId, intent.parameters);

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

      case "remote":
        return await this.remoteExecutor.execute(capabilityId, parameters);

      default:
        throw new Error(`Unknown capability category: ${category}`);
    }
  }

  private async executeClipboard(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
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
      const escapedText = shellEscape(parameters.text);
      if (process.platform === "darwin") {
        await execAsync(`echo ${escapedText} | pbcopy`);
      } else if (process.platform === "win32") {
        await execAsync(`powershell Set-Clipboard -Value ${escapedText}`);
      } else {
        await execAsync(`echo ${escapedText} | xclip -selection clipboard`);
      }
      return { success: true };
    }

    throw new Error(`Unknown clipboard capability: ${capabilityId}`);
  }

  private async executeScreenshot(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    if (capabilityId === "screenshot.capture") {
      const escapedPath = shellEscape(parameters.path);
      if (process.platform === "darwin") {
        await execAsync(`screencapture ${escapedPath}`);
      } else if (process.platform === "win32") {
        await execAsync(
          `powershell Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | Out-Null; $screen = [System.Windows.Forms.Screen]::PrimaryScreen; $bounds = $screen.Bounds; $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bitmap.Save(${escapedPath}); $bitmap.Dispose(); $graphics.Dispose()`,
        );
      } else {
        await execAsync(`scrot ${escapedPath}`);
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
      "system.storage.clean_temp",
      "system.storage.empty_trash",
      "system.storage.find_large_files",
      "system.storage.analyze_usage",
      "security.firewall.enable",
      "security.scan.malware",
      "system.updates.check",
      "security.logs.view",
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
      "network.wifi.restart",
      "network.dns.flush",
      "network.ip.renew",
      "network.test_connection",
      // Clipboard
      "clipboard.read",
      "clipboard.write",
      // Screenshot
      "screenshot.capture",
      // Remote session capabilities
      "remote.session.create",
      "remote.session.connect",
      "remote.session.end",
      "remote.session.get_state",
      "remote.control.enable",
      "remote.control.disable",
      "remote.screen.start_stream",
      "remote.screen.stop_stream",
      "remote.input.send",
      "remote.file.send",
      "remote.clipboard.sync_enable",
      "remote.clipboard.sync_disable",
      "remote.device.info",
    ];
  }

  /**
   * Set signaling callback for remote sessions
   */
  setRemoteSignalingCallback(callback: ((message: any) => void) | null): void {
    this.remoteExecutor.setSignalingCallback(callback);
  }

  /**
   * Handle incoming signaling message for remote sessions
   */
  handleRemoteSignalingMessage(message: any): void {
    this.remoteExecutor.handleSignalingMessage(message);
  }

  /**
   * Get active remote sessions
   */
  getActiveRemoteSessions(): string[] {
    return this.remoteExecutor.getActiveSessions();
  }

  /**
   * Cleanup (call on shutdown)
   */
  cleanup(): void {
    this.remoteExecutor.cleanup();
  }
}
