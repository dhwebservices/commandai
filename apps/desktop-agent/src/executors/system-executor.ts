import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);

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

export class SystemExecutor {
  private readonly platform = process.platform;

  // Helper to execute sudo commands on macOS with password prompt
  private async execWithSudo(command: string): Promise<string> {
    if (this.platform === "darwin") {
      // Use osascript to prompt for password on macOS
      const wrappedCommand = `osascript -e 'do shell script "${command.replace(/"/g, '\\"')}" with administrator privileges'`;
      const { stdout } = await execAsync(wrappedCommand);
      return stdout;
    } else {
      // On other platforms, just try to run it
      const { stdout } = await execAsync(command);
      return stdout;
    }
  }

  async execute(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityId) {
      case "system.cpu.usage":
        return await this.getCPUUsage();

      case "system.memory.usage":
        return this.getMemoryUsage();

      case "system.disk.usage":
        return await this.getDiskUsage(parameters.path);

      case "system.network.interfaces":
        return this.getNetworkInterfaces();

      case "system.info":
        return this.getSystemInfo();

      case "system.uptime":
        return { uptime: os.uptime(), formatted: this.formatUptime(os.uptime()) };

      case "system.shutdown":
        return await this.shutdown(parameters.delay || 0);

      case "system.restart":
        return await this.restart(parameters.delay || 0);

      case "system.sleep":
        return await this.sleep();

      case "system.storage.clean_temp":
        return await this.cleanTempFiles();

      case "system.storage.empty_trash":
        return await this.emptyTrash();

      case "system.storage.find_large_files":
        return await this.findLargeFiles(parameters.path, parameters.minSize);

      case "system.storage.analyze_usage":
        return await this.analyzeStorageUsage(parameters.path);

      case "security.firewall.enable":
        return await this.enableFirewall();

      case "security.scan.malware":
        return await this.scanForMalware();

      case "system.updates.check":
        return await this.checkForUpdates();

      case "security.logs.view":
        return await this.viewSecurityLogs();

      default:
        throw new Error(`Unknown system capability: ${capabilityId}`);
    }
  }

  private async getCPUUsage(): Promise<any> {
    const cpus = os.cpus();
    const usage = cpus.map((cpu, index) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      const used = total - idle;
      return {
        core: index,
        model: cpu.model,
        speed: cpu.speed,
        usage: ((used / total) * 100).toFixed(2) + "%",
      };
    });

    return { cpus: usage, count: cpus.length };
  }

  private getMemoryUsage(): any {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return {
      total: this.formatBytes(total),
      used: this.formatBytes(used),
      free: this.formatBytes(free),
      usagePercent: ((used / total) * 100).toFixed(2) + "%",
    };
  }

  private async getDiskUsage(targetPath?: string): Promise<any> {
    if (this.platform === "win32") {
      const { stdout } = await execAsync("wmic logicaldisk get size,freespace,caption");
      return this.parseWindowsDiskInfo(stdout);
    } else {
      const { stdout } = await execAsync("df -h");
      return this.parseUnixDiskInfo(stdout);
    }
  }

  private getNetworkInterfaces(): any {
    const interfaces = os.networkInterfaces();
    const result: any[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        result.push({
          name,
          addresses: addrs.map((addr) => ({
            address: addr.address,
            family: addr.family,
            internal: addr.internal,
            mac: addr.mac,
          })),
        });
      }
    }

    return result;
  }

  private getSystemInfo(): any {
    return {
      platform: os.platform(),
      type: os.type(),
      arch: os.arch(),
      release: os.release(),
      version: os.version(),
      hostname: os.hostname(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
    };
  }

  private async shutdown(delay: number): Promise<any> {
    try {
      if (this.platform === "win32") {
        await execAsync(`shutdown /s /t ${delay}`);
      } else if (this.platform === "darwin") {
        await this.execWithSudo(`shutdown -h +${Math.floor(delay / 60)}`);
      } else {
        await execAsync(`shutdown -h +${Math.floor(delay / 60)}`);
      }
      return { success: true, delay };
    } catch (error: any) {
      throw new Error(`Shutdown failed: ${error.message}`);
    }
  }

  private async restart(delay: number): Promise<any> {
    try {
      if (this.platform === "win32") {
        await execAsync(`shutdown /r /t ${delay}`);
      } else if (this.platform === "darwin") {
        await this.execWithSudo(`shutdown -r +${Math.floor(delay / 60)}`);
      } else {
        await execAsync(`shutdown -r +${Math.floor(delay / 60)}`);
      }
      return { success: true, delay };
    } catch (error: any) {
      throw new Error(`Restart failed: ${error.message}`);
    }
  }

  private async sleep(): Promise<any> {
    const command =
      this.platform === "win32"
        ? "rundll32.exe powrprof.dll,SetSuspendState 0,1,0"
        : this.platform === "darwin"
        ? "pmset sleepnow"
        : "systemctl suspend";

    await execAsync(command);
    return { success: true };
  }

  private formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  private parseWindowsDiskInfo(output: string): any[] {
    const lines = output.trim().split("\n").slice(1);
    return lines
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          drive: parts[0],
          free: this.formatBytes(parseInt(parts[1] || "0")),
          total: this.formatBytes(parseInt(parts[2] || "0")),
        };
      });
  }

  private parseUnixDiskInfo(output: string): any[] {
    const lines = output.trim().split("\n").slice(1);
    return lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        filesystem: parts[0],
        size: parts[1],
        used: parts[2],
        available: parts[3],
        usage: parts[4],
        mounted: parts[5],
      };
    });
  }

  private async cleanTempFiles(): Promise<any> {
    let removedCount = 0;
    let freedSpace = 0;
    let errors: string[] = [];

    try {
      if (this.platform === "darwin") {
        // Clean macOS temp files
        const commands = [
          "rm -rf ~/Library/Caches/*",
          "rm -rf /tmp/*",
          "rm -rf /var/tmp/*",
        ];

        for (const cmd of commands) {
          try {
            await execAsync(cmd);
            removedCount++;
          } catch (error: any) {
            errors.push(error.message);
          }
        }
      } else if (this.platform === "win32") {
        await execAsync("del /q /f /s %temp%\\*");
        removedCount++;
      } else {
        await execAsync("rm -rf /tmp/* /var/tmp/*");
        removedCount++;
      }

      return {
        success: true,
        message: `Cleaned temporary files (${removedCount} locations)`,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to clean temporary files",
        error: error.message,
      };
    }
  }

  private async emptyTrash(): Promise<any> {
    try {
      if (this.platform === "darwin") {
        await execAsync("rm -rf ~/.Trash/*");
      } else if (this.platform === "win32") {
        await execAsync("rd /s /q %systemdrive%\\$Recycle.bin");
      } else {
        await execAsync("rm -rf ~/.local/share/Trash/*");
      }

      return {
        success: true,
        message: "Trash emptied successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to empty trash",
        error: error.message,
      };
    }
  }

  private async findLargeFiles(targetPath: string = "~", minSizeMB: number = 100): Promise<any> {
    try {
      let command: string;
      const escapedPath = shellEscape(targetPath);

      if (this.platform === "darwin" || this.platform === "linux") {
        command = `find ${escapedPath} -type f -size +${minSizeMB}M -exec ls -lh {} \\; 2>/dev/null | head -50`;
      } else {
        command = `forfiles /S /M *.* /C "cmd /c if @fsize GEQ ${minSizeMB * 1024 * 1024} echo @path @fsize"`;
      }

      const { stdout } = await execAsync(command);
      const lines = stdout.trim().split("\n").filter(line => line.length > 0);

      return {
        success: true,
        count: lines.length,
        files: lines.slice(0, 50),
        message: `Found ${lines.length} files larger than ${minSizeMB}MB`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to find large files",
        error: error.message,
      };
    }
  }

  private async analyzeStorageUsage(targetPath: string = "~"): Promise<any> {
    try {
      let command: string;
      const escapedPath = shellEscape(targetPath);

      if (this.platform === "darwin") {
        command = `du -sh ${escapedPath}/* 2>/dev/null | sort -hr | head -20`;
      } else if (this.platform === "win32") {
        command = `dir ${escapedPath} /s /-c | find "Dir(s)"`;
      } else {
        command = `du -sh ${escapedPath}/* 2>/dev/null | sort -hr | head -20`;
      }

      const { stdout } = await execAsync(command);

      return {
        success: true,
        analysis: stdout.trim(),
        message: "Storage usage analysis complete",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to analyze storage usage",
        error: error.message,
      };
    }
  }

  private async enableFirewall(): Promise<any> {
    try {
      if (this.platform === "darwin") {
        await execAsync("sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on");
      } else if (this.platform === "win32") {
        await execAsync("netsh advfirewall set allprofiles state on");
      } else {
        await execAsync("sudo ufw enable");
      }

      return {
        success: true,
        message: "Firewall enabled successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to enable firewall. This operation requires admin/sudo privileges.",
        error: error.message,
      };
    }
  }

  private async scanForMalware(): Promise<any> {
    try {
      let command: string;
      let message: string;

      if (this.platform === "darwin") {
        // Use XProtect remediator on macOS
        command = "sudo /usr/libexec/XProtectBehaviorService --check";
        message = "Malware scan completed using XProtect";
      } else if (this.platform === "win32") {
        // Use Windows Defender
        command = "powershell Start-MpScan -ScanType QuickScan";
        message = "Quick scan completed using Windows Defender";
      } else {
        // Use ClamAV on Linux if available
        command = "clamscan -r --bell -i /home 2>&1 | head -20";
        message = "Scan completed (install ClamAV for full scanning)";
      }

      const { stdout } = await execAsync(command);

      return {
        success: true,
        message,
        scan_output: stdout.trim(),
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Malware scan encountered issues (may require admin privileges)",
        error: error.message,
      };
    }
  }

  private async checkForUpdates(): Promise<any> {
    try {
      let command: string;

      if (this.platform === "darwin") {
        command = "softwareupdate -l";
      } else if (this.platform === "win32") {
        command = "powershell Get-WindowsUpdate";
      } else {
        command = "apt list --upgradable 2>/dev/null || yum check-update 2>/dev/null";
      }

      const { stdout } = await execAsync(command);
      const hasUpdates = stdout.trim().length > 100;

      return {
        success: true,
        hasUpdates,
        message: hasUpdates ? "Updates available" : "System is up to date",
        updates: stdout.trim(),
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to check for updates",
        error: error.message,
      };
    }
  }

  private async viewSecurityLogs(): Promise<any> {
    try {
      let command: string;

      if (this.platform === "darwin") {
        command = "log show --predicate 'subsystem == \"com.apple.securityd\"' --last 1h | tail -50";
      } else if (this.platform === "win32") {
        command = "powershell Get-EventLog -LogName Security -Newest 50 | Format-Table -AutoSize";
      } else {
        command = "sudo tail -50 /var/log/auth.log";
      }

      const { stdout } = await execAsync(command);

      return {
        success: true,
        logs: stdout.trim(),
        message: "Security logs retrieved",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to retrieve security logs (may require admin privileges)",
        error: error.message,
      };
    }
  }
}
