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
exports.SystemExecutor = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const os = __importStar(require("os"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SystemExecutor {
    constructor() {
        this.platform = process.platform;
    }
    async execute(capabilityId, parameters) {
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
    async getCPUUsage() {
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
    getMemoryUsage() {
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
    async getDiskUsage(targetPath) {
        if (this.platform === "win32") {
            const { stdout } = await execAsync("wmic logicaldisk get size,freespace,caption");
            return this.parseWindowsDiskInfo(stdout);
        }
        else {
            const { stdout } = await execAsync("df -h");
            return this.parseUnixDiskInfo(stdout);
        }
    }
    getNetworkInterfaces() {
        const interfaces = os.networkInterfaces();
        const result = [];
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
    getSystemInfo() {
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
    async shutdown(delay) {
        const command = this.platform === "win32"
            ? `shutdown /s /t ${delay}`
            : this.platform === "darwin"
                ? `sudo shutdown -h +${Math.floor(delay / 60)}`
                : `shutdown -h +${Math.floor(delay / 60)}`;
        await execAsync(command);
        return { success: true, delay };
    }
    async restart(delay) {
        const command = this.platform === "win32"
            ? `shutdown /r /t ${delay}`
            : this.platform === "darwin"
                ? `sudo shutdown -r +${Math.floor(delay / 60)}`
                : `shutdown -r +${Math.floor(delay / 60)}`;
        await execAsync(command);
        return { success: true, delay };
    }
    async sleep() {
        const command = this.platform === "win32"
            ? "rundll32.exe powrprof.dll,SetSuspendState 0,1,0"
            : this.platform === "darwin"
                ? "pmset sleepnow"
                : "systemctl suspend";
        await execAsync(command);
        return { success: true };
    }
    formatBytes(bytes) {
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        if (bytes === 0)
            return "0 Bytes";
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
    }
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    }
    parseWindowsDiskInfo(output) {
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
    parseUnixDiskInfo(output) {
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
exports.SystemExecutor = SystemExecutor;
