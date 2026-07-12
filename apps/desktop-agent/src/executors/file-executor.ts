import { promises as fs } from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class FileExecutor {
  async execute(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityId) {
      case "file.read":
        return await fs.readFile(parameters.path, "utf-8");

      case "file.write":
        await fs.writeFile(parameters.path, parameters.content, "utf-8");
        return { success: true, path: parameters.path };

      case "file.append":
        await fs.appendFile(parameters.path, parameters.content, "utf-8");
        return { success: true, path: parameters.path };

      case "file.delete":
        await fs.unlink(parameters.path);
        return { success: true, deleted: parameters.path };

      case "file.move":
        await fs.rename(parameters.source, parameters.destination);
        return { success: true, from: parameters.source, to: parameters.destination };

      case "file.copy":
        await fs.copyFile(parameters.source, parameters.destination);
        return { success: true, from: parameters.source, to: parameters.destination };

      case "file.list": {
        const files = await fs.readdir(parameters.path, { withFileTypes: true });
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
        const stats = await fs.stat(parameters.path);
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
        await fs.chmod(parameters.path, parseInt(parameters.permissions, 8));
        return { success: true, path: parameters.path };

      case "directory.create":
        await fs.mkdir(parameters.path, { recursive: parameters.recursive });
        return { success: true, path: parameters.path };

      case "directory.delete":
        await fs.rm(parameters.path, { recursive: true, force: true });
        return { success: true, deleted: parameters.path };

      default:
        throw new Error(`Unknown file capability: ${capabilityId}`);
    }
  }

  private async listRecursive(dir: string): Promise<any[]> {
    const results: any[] = [];
    const files = await fs.readdir(dir, { withFileTypes: true });

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

  private async searchFiles(dir: string, pattern: string): Promise<string[]> {
    const results: string[] = [];
    const files = await fs.readdir(dir, { withFileTypes: true });

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
