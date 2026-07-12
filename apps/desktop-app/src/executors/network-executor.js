"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkExecutor = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class NetworkExecutor {
    constructor() {
        this.platform = process.platform;
    }
    async execute(capabilityId, parameters) {
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
    async ping(host, count) {
        const numPings = count || 4;
        const command = this.platform === "win32"
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
        }
        catch (error) {
            return {
                success: false,
                host,
                output: error.stdout || error.message,
                reachable: false,
            };
        }
    }
    async dnsLookup(hostname) {
        const command = this.platform === "win32" ? `nslookup ${hostname}` : `dig +short ${hostname}`;
        const { stdout } = await execAsync(command);
        return {
            hostname,
            result: stdout.trim(),
        };
    }
    async portCheck(host, port) {
        return new Promise((resolve) => {
            const client = http.request({
                host,
                port,
                method: "HEAD",
                timeout: 5000,
            }, () => {
                resolve({ host, port, open: true });
            });
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
    async download(url, destination) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith("https") ? https : http;
            const file = fs.open(destination, "w");
            protocol
                .get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }
                const chunks = [];
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
    async getConnections() {
        if (this.platform === "win32") {
            const { stdout } = await execAsync("netstat -ano");
            return this.parseWindowsNetstat(stdout);
        }
        else {
            const { stdout } = await execAsync("netstat -an");
            return this.parseUnixNetstat(stdout);
        }
    }
    parseWindowsNetstat(output) {
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
    parseUnixNetstat(output) {
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
exports.NetworkExecutor = NetworkExecutor;
