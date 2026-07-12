import { FileExecutor } from "./executors/file-executor.js";
import { SystemExecutor } from "./executors/system-executor.js";
import { ProcessExecutor } from "./executors/process-executor.js";
import { NetworkExecutor } from "./executors/network-executor.js";

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
      if (process.platform === "darwin") {
        await execAsync(`echo "${parameters.text}" | pbcopy`);
      } else if (process.platform === "win32") {
        await execAsync(`powershell Set-Clipboard -Value "${parameters.text}"`);
      } else {
        await execAsync(`echo "${parameters.text}" | xclip -selection clipboard`);
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
      if (process.platform === "darwin") {
        await execAsync(`screencapture "${parameters.path}"`);
      } else if (process.platform === "win32") {
        await execAsync(
          `powershell Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | Out-Null; $screen = [System.Windows.Forms.Screen]::PrimaryScreen; $bounds = $screen.Bounds; $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bitmap.Save("${parameters.path}"); $bitmap.Dispose(); $graphics.Dispose()`,
        );
      } else {
        await execAsync(`scrot "${parameters.path}"`);
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
}
