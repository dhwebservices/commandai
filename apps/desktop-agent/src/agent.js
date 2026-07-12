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
exports.DesktopAgent = void 0;
const file_executor_js_1 = require("./executors/file-executor.js");
const system_executor_js_1 = require("./executors/system-executor.js");
const process_executor_js_1 = require("./executors/process-executor.js");
const network_executor_js_1 = require("./executors/network-executor.js");
class DesktopAgent {
    constructor() {
        this.fileExecutor = new file_executor_js_1.FileExecutor();
        this.systemExecutor = new system_executor_js_1.SystemExecutor();
        this.processExecutor = new process_executor_js_1.ProcessExecutor();
        this.networkExecutor = new network_executor_js_1.NetworkExecutor();
    }
    async executeIntent(intent) {
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
        }
        catch (error) {
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
    async executeCapability(capabilityId, parameters) {
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
    async executeClipboard(capabilityId, parameters) {
        const { exec } = await Promise.resolve().then(() => __importStar(require("child_process")));
        const { promisify } = await Promise.resolve().then(() => __importStar(require("util")));
        const execAsync = promisify(exec);
        if (capabilityId === "clipboard.read") {
            if (process.platform === "darwin") {
                const { stdout } = await execAsync("pbpaste");
                return { text: stdout };
            }
            else if (process.platform === "win32") {
                const { stdout } = await execAsync("powershell Get-Clipboard");
                return { text: stdout };
            }
            else {
                const { stdout } = await execAsync("xclip -selection clipboard -o");
                return { text: stdout };
            }
        }
        else if (capabilityId === "clipboard.write") {
            if (process.platform === "darwin") {
                await execAsync(`echo "${parameters.text}" | pbcopy`);
            }
            else if (process.platform === "win32") {
                await execAsync(`powershell Set-Clipboard -Value "${parameters.text}"`);
            }
            else {
                await execAsync(`echo "${parameters.text}" | xclip -selection clipboard`);
            }
            return { success: true };
        }
        throw new Error(`Unknown clipboard capability: ${capabilityId}`);
    }
    async executeScreenshot(capabilityId, parameters) {
        const { exec } = await Promise.resolve().then(() => __importStar(require("child_process")));
        const { promisify } = await Promise.resolve().then(() => __importStar(require("util")));
        const execAsync = promisify(exec);
        if (capabilityId === "screenshot.capture") {
            if (process.platform === "darwin") {
                await execAsync(`screencapture "${parameters.path}"`);
            }
            else if (process.platform === "win32") {
                await execAsync(`powershell Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | Out-Null; $screen = [System.Windows.Forms.Screen]::PrimaryScreen; $bounds = $screen.Bounds; $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bitmap.Save("${parameters.path}"); $bitmap.Dispose(); $graphics.Dispose()`);
            }
            else {
                await execAsync(`scrot "${parameters.path}"`);
            }
            return { success: true, path: parameters.path };
        }
        throw new Error(`Unknown screenshot capability: ${capabilityId}`);
    }
    getCapabilities() {
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
exports.DesktopAgent = DesktopAgent;
