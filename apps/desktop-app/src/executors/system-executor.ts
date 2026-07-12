import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);

export class SystemExecutor {
  private readonly platform = process.platform;

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
    const command =
      this.platform === "win32"
        ? `shutdown /s /t ${delay}`
        : this.platform === "darwin"
        ? `sudo shutdown -h +${Math.floor(delay / 60)}`
        : `shutdown -h +${Math.floor(delay / 60)}`;

    await execAsync(command);
    return { success: true, delay };
  }

  private async restart(delay: number): Promise<any> {
    const command =
      this.platform === "win32"
        ? `shutdown /r /t ${delay}`
        : this.platform === "darwin"
        ? `sudo shutdown -r +${Math.floor(delay / 60)}`
        : `shutdown -r +${Math.floor(delay / 60)}`;

    await execAsync(command);
    return { success: true, delay };
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
}
