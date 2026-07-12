import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class ProcessExecutor {
  private readonly platform = process.platform;

  async execute(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityId) {
      case "process.list":
        return await this.listProcesses();

      case "process.get_info":
        return await this.getProcessInfo(parameters.pid);

      case "process.kill":
        return await this.killProcess(parameters.pid, parameters.signal);

      case "process.start":
        return await this.startProcess(parameters.command, parameters.args);

      case "app.launch":
        return await this.launchApp(parameters.name, parameters.args);

      case "app.quit":
        return await this.quitApp(parameters.name);

      case "app.list":
        return await this.listApplications();

      case "app.list_running":
        return await this.listRunningApplications();

      default:
        throw new Error(`Unknown process capability: ${capabilityId}`);
    }
  }

  private async listProcesses(): Promise<any[]> {
    if (this.platform === "win32") {
      const { stdout } = await execAsync(
        'powershell "Get-Process | Select-Object Id,ProcessName,CPU,WorkingSet | ConvertTo-Json"',
      );
      return JSON.parse(stdout);
    } else {
      const { stdout } = await execAsync("ps aux");
      return this.parseUnixPs(stdout);
    }
  }

  private async getProcessInfo(pid: number): Promise<any> {
    if (this.platform === "win32") {
      const { stdout } = await execAsync(
        `powershell "Get-Process -Id ${pid} | Select-Object * | ConvertTo-Json"`,
      );
      return JSON.parse(stdout);
    } else {
      const { stdout } = await execAsync(`ps -p ${pid} -o pid,ppid,user,pcpu,pmem,vsz,rss,tty,stat,start,time,command`);
      return this.parseUnixPs(stdout)[0];
    }
  }

  private async killProcess(pid: number, signal?: string): Promise<any> {
    if (this.platform === "win32") {
      await execAsync(`taskkill /PID ${pid} /F`);
    } else {
      const sig = signal || "SIGTERM";
      await execAsync(`kill -${sig} ${pid}`);
    }
    return { success: true, pid, signal: signal || "SIGTERM" };
  }

  private async startProcess(command: string, args?: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args || [], {
        detached: true,
        stdio: "ignore",
      });

      proc.on("error", reject);
      proc.unref();

      resolve({
        success: true,
        pid: proc.pid,
        command,
        args,
      });
    });
  }

  private async launchApp(name: string, args?: string[]): Promise<any> {
    if (this.platform === "darwin") {
      const command = `open -a "${name}" ${args ? args.join(" ") : ""}`;
      await execAsync(command);
      return { success: true, app: name };
    } else if (this.platform === "win32") {
      const command = `start "" "${name}" ${args ? args.join(" ") : ""}`;
      await execAsync(command);
      return { success: true, app: name };
    } else {
      // Linux
      const command = `${name} ${args ? args.join(" ") : ""} &`;
      await execAsync(command);
      return { success: true, app: name };
    }
  }

  private async quitApp(name: string): Promise<any> {
    if (this.platform === "darwin") {
      await execAsync(`osascript -e 'quit app "${name}"'`);
      return { success: true, app: name };
    } else if (this.platform === "win32") {
      await execAsync(`taskkill /IM "${name}.exe" /F`);
      return { success: true, app: name };
    } else {
      await execAsync(`pkill -f "${name}"`);
      return { success: true, app: name };
    }
  }

  private async listApplications(): Promise<any[]> {
    if (this.platform === "darwin") {
      const { stdout } = await execAsync("ls /Applications");
      return stdout
        .split("\n")
        .filter((app) => app.endsWith(".app"))
        .map((app) => ({ name: app.replace(".app", ""), path: `/Applications/${app}` }));
    } else if (this.platform === "win32") {
      const { stdout } = await execAsync(
        'powershell "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName,InstallLocation | ConvertTo-Json"',
      );
      return JSON.parse(stdout);
    } else {
      // Linux - list from /usr/share/applications
      const { stdout } = await execAsync("ls /usr/share/applications/*.desktop");
      return stdout.split("\n").filter(Boolean).map((path) => ({
        name: path.split("/").pop()?.replace(".desktop", ""),
        path,
      }));
    }
  }

  private async listRunningApplications(): Promise<any[]> {
    if (this.platform === "darwin") {
      const { stdout } = await execAsync(
        'osascript -e \'tell application "System Events" to get name of every process whose background only is false\'',
      );
      return stdout.split(", ").map((name) => ({ name: name.trim() }));
    } else {
      return await this.listProcesses();
    }
  }

  private parseUnixPs(output: string): any[] {
    const lines = output.trim().split("\n");
    if (lines.length === 0) return [];

    const headers = lines[0]!.toLowerCase().split(/\s+/);
    const data = lines.slice(1);

    return data.map((line) => {
      const parts = line.trim().split(/\s+/);
      const proc: any = {};

      headers.forEach((header, index) => {
        proc[header] = parts[index];
      });

      return proc;
    });
  }
}
