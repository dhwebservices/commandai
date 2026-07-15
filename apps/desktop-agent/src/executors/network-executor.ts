import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as https from "https";
import * as http from "http";

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

export class NetworkExecutor {
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
      case "network.ping":
        if (!parameters.host || typeof parameters.host !== 'string') {
          throw new Error('network.ping requires string parameter: host');
        }
        if (parameters.count !== undefined && typeof parameters.count !== 'number') {
          throw new Error('network.ping count parameter must be a number');
        }
        return await this.ping(parameters.host, parameters.count);

      case "network.dns_lookup":
        if (!parameters.hostname || typeof parameters.hostname !== 'string') {
          throw new Error('network.dns_lookup requires string parameter: hostname');
        }
        return await this.dnsLookup(parameters.hostname);

      case "network.port_check":
        if (!parameters.host || typeof parameters.host !== 'string') {
          throw new Error('network.port_check requires string parameter: host');
        }
        if (typeof parameters.port !== 'number' || parameters.port < 1 || parameters.port > 65535) {
          throw new Error('network.port_check requires port number between 1-65535');
        }
        return await this.portCheck(parameters.host, parameters.port);

      case "network.download":
        if (!parameters.url || typeof parameters.url !== 'string') {
          throw new Error('network.download requires string parameter: url');
        }
        if (!parameters.destination || typeof parameters.destination !== 'string') {
          throw new Error('network.download requires string parameter: destination');
        }
        return await this.download(parameters.url, parameters.destination);

      case "network.get_connections":
        return await this.getConnections();

      case "network.wifi.restart":
        return await this.restartWifi();

      case "network.dns.flush":
        return await this.flushDNS();

      case "network.ip.renew":
        return await this.renewIP();

      case "network.test_connection":
        return await this.testConnection();

      default:
        throw new Error(`Unknown network capability: ${capabilityId}`);
    }
  }

  private async ping(host: string, count?: number): Promise<any> {
    const numPings = count || 4;
    const escapedHost = shellEscape(host);
    const command =
      this.platform === "win32"
        ? `ping -n ${numPings} ${escapedHost}`
        : `ping -c ${numPings} ${escapedHost}`;

    try {
      const { stdout } = await execAsync(command);
      return {
        success: true,
        host,
        output: stdout,
        reachable: true,
      };
    } catch (error: any) {
      return {
        success: false,
        host,
        output: error.stdout || error.message,
        reachable: false,
      };
    }
  }

  private async dnsLookup(hostname: string): Promise<any> {
    const escapedHostname = shellEscape(hostname);
    const command =
      this.platform === "win32" ? `nslookup ${escapedHostname}` : `dig +short ${escapedHostname}`;

    const { stdout } = await execAsync(command);
    return {
      hostname,
      result: stdout.trim(),
    };
  }

  private async portCheck(host: string, port: number): Promise<any> {
    return new Promise((resolve) => {
      const client = http.request(
        {
          host,
          port,
          method: "HEAD",
          timeout: 5000,
        },
        () => {
          resolve({ host, port, open: true });
        },
      );

      client.on("error", () => {
        resolve({ host, port, open: false });
      });

      client.on("timeout", () => {
        client.destroy();
        resolve({ host, port, open: false });
      });

      client.end();
    });
  }

  private async download(url: string, destination: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https") ? https : http;

      protocol
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }

          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", async () => {
            const buffer = Buffer.concat(chunks);
            await fs.writeFile(destination, buffer);
            resolve({
              success: true,
              url,
              destination,
              size: buffer.length,
            });
          });
        })
        .on("error", reject);
    });
  }

  private async getConnections(): Promise<any> {
    if (this.platform === "win32") {
      const { stdout } = await execAsync("netstat -ano");
      return this.parseWindowsNetstat(stdout);
    } else {
      const { stdout } = await execAsync("netstat -an");
      return this.parseUnixNetstat(stdout);
    }
  }

  private parseWindowsNetstat(output: string): any[] {
    const lines = output.split("\n").slice(4);
    return lines
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          protocol: parts[0],
          localAddress: parts[1],
          foreignAddress: parts[2],
          state: parts[3],
          pid: parts[4],
        };
      });
  }

  private parseUnixNetstat(output: string): any[] {
    const lines = output.split("\n").slice(2);
    return lines
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          protocol: parts[0],
          recvQ: parts[1],
          sendQ: parts[2],
          localAddress: parts[3],
          foreignAddress: parts[4],
          state: parts[5],
        };
      });
  }

  private async restartWifi(): Promise<any> {
    try {
      if (this.platform === "darwin") {
        await execAsync("networksetup -setairportpower en0 off");
        await new Promise(resolve => setTimeout(resolve, 2000));
        await execAsync("networksetup -setairportpower en0 on");
      } else if (this.platform === "win32") {
        await execAsync("netsh interface set interface \"Wi-Fi\" disabled");
        await new Promise(resolve => setTimeout(resolve, 2000));
        await execAsync("netsh interface set interface \"Wi-Fi\" enabled");
      } else {
        await execAsync("nmcli radio wifi off");
        await new Promise(resolve => setTimeout(resolve, 2000));
        await execAsync("nmcli radio wifi on");
      }

      return {
        success: true,
        message: "Wi-Fi restarted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to restart Wi-Fi",
        error: error.message,
      };
    }
  }

  private async flushDNS(): Promise<any> {
    try {
      if (this.platform === "darwin") {
        await this.execWithSudo("dscacheutil -flushcache && killall -HUP mDNSResponder");
      } else if (this.platform === "win32") {
        await execAsync("ipconfig /flushdns");
      } else {
        await this.execWithSudo("systemd-resolve --flush-caches");
      }

      return {
        success: true,
        message: "DNS cache flushed successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to flush DNS cache: " + error.message,
        error: error.message,
      };
    }
  }

  private async renewIP(): Promise<any> {
    try {
      if (this.platform === "darwin") {
        await this.execWithSudo("ipconfig set en0 DHCP");
      } else if (this.platform === "win32") {
        await execAsync("ipconfig /release && ipconfig /renew");
      } else {
        await this.execWithSudo("dhclient -r && dhclient");
      }

      return {
        success: true,
        message: "IP address renewed successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to renew IP address",
        error: error.message,
      };
    }
  }

  private async testConnection(): Promise<any> {
    try {
      const targets = ["8.8.8.8", "1.1.1.1", "google.com"];
      const results = [];

      for (const target of targets) {
        const result = await this.ping(target, 2);
        results.push({
          target,
          success: result.reachable,
        });
      }

      const allSuccess = results.every(r => r.success);

      return {
        success: allSuccess,
        message: allSuccess ? "Internet connection is working" : "Internet connection issues detected",
        tests: results,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to test connection",
        error: error.message,
      };
    }
  }
}
