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
exports.FileExecutor = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class FileExecutor {
    async execute(capabilityId, parameters) {
        switch (capabilityId) {
            case "file.read":
                return await fs_1.promises.readFile(parameters.path, "utf-8");
            case "file.write":
                await fs_1.promises.writeFile(parameters.path, parameters.content, "utf-8");
                return { success: true, path: parameters.path };
            case "file.append":
                await fs_1.promises.appendFile(parameters.path, parameters.content, "utf-8");
                return { success: true, path: parameters.path };
            case "file.delete":
                await fs_1.promises.unlink(parameters.path);
                return { success: true, deleted: parameters.path };
            case "file.move":
                await fs_1.promises.rename(parameters.source, parameters.destination);
                return { success: true, from: parameters.source, to: parameters.destination };
            case "file.copy":
                await fs_1.promises.copyFile(parameters.source, parameters.destination);
                return { success: true, from: parameters.source, to: parameters.destination };
            case "file.list": {
                const files = await fs_1.promises.readdir(parameters.path, { withFileTypes: true });
                if (parameters.recursive) {
                    return await this.listRecursive(parameters.path);
                }
                return files.map((f) => ({
                    name: f.name,
                    isDirectory: f.isDirectory(),
                    isFile: f.isFile(),
                }));
            }
            case "file.search": {
                const files = await this.searchFiles(parameters.path, parameters.pattern);
                return { matches: files };
            }
            case "file.get_info": {
                const stats = await fs_1.promises.stat(parameters.path);
                return {
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    accessed: stats.atime,
                    isDirectory: stats.isDirectory(),
                    isFile: stats.isFile(),
                    permissions: stats.mode.toString(8),
                };
            }
            case "file.set_permissions":
                await fs_1.promises.chmod(parameters.path, parseInt(parameters.permissions, 8));
                return { success: true, path: parameters.path };
            case "directory.create":
                await fs_1.promises.mkdir(parameters.path, { recursive: parameters.recursive });
                return { success: true, path: parameters.path };
            case "directory.delete":
                await fs_1.promises.rm(parameters.path, { recursive: true, force: true });
                return { success: true, deleted: parameters.path };
            default:
                throw new Error(`Unknown file capability: ${capabilityId}`);
        }
    }
    async listRecursive(dir) {
        const results = [];
        const files = await fs_1.promises.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            results.push({
                path: fullPath,
                name: file.name,
                isDirectory: file.isDirectory(),
                isFile: file.isFile(),
            });
            if (file.isDirectory()) {
                const subFiles = await this.listRecursive(fullPath);
                results.push(...subFiles);
            }
        }
        return results;
    }
    async searchFiles(dir, pattern) {
        const results = [];
        const files = await fs_1.promises.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.name.includes(pattern)) {
                results.push(fullPath);
            }
            if (file.isDirectory()) {
                const subResults = await this.searchFiles(fullPath, pattern);
                results.push(...subResults);
            }
        }
        return results;
    }
}
exports.FileExecutor = FileExecutor;
