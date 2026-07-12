import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as https from "https";
import * as http from "http";

const execAsync = promisify(exec);

export class NetworkExecutor {
  private readonly platform = process.platform;

  async execute(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityId) {
      case "network.ping":
        return await this.ping(parameters.host, parameters.count);

      case "network.dns_lookup":
        return await this.dnsLookup(parameters.hostname);

      case "network.port_check":
        return await this.portCheck(parameters.host, parameters.port);

      case "network.download":
        return await this.download(parameters.url, parameters.destination);

      case "network.get_connections":
        return await this.getConnections();

      default:
        throw new Error(`Unknown network capability: ${capabilityId}`);
    }
  }

  private async ping(host: string, count?: number): Promise<any> {
    const numPings = count || 4;
    const command =
      this.platform === "win32"
        ? `ping -n ${numPings} ${host}`
        : `ping -c ${numPings} ${host}`;

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
    const command =
      this.platform === "win32" ? `nslookup ${hostname}` : `dig +short ${hostname}`;

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
      const file = fs.open(destination, "w");

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
}
