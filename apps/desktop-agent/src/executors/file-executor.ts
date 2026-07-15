import { promises as fs } from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);

/**
 * Validates and normalizes a file path to prevent directory traversal attacks.
 * Ensures the path stays within user's home directory or explicitly allowed locations.
 */
function validatePath(inputPath: string): string {
  // Resolve to absolute path and normalize
  const normalizedPath = path.resolve(inputPath);

  // Define allowed base directories
  const homeDir = os.homedir();
  const tmpDir = os.tmpdir();
  const allowedBases = [homeDir, tmpDir];

  // Check if path is within any allowed base directory
  const isAllowed = allowedBases.some(base => {
    const resolvedBase = path.resolve(base);
    return normalizedPath.startsWith(resolvedBase);
  });

  if (!isAllowed) {
    throw new Error(`Access denied: Path must be within user home directory or temp directory. Got: ${normalizedPath}`);
  }

  return normalizedPath;
}

export class FileExecutor {
  async execute(capabilityId: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityId) {
      case "file.read": {
        if (!parameters.path || typeof parameters.path !== 'string') {
          throw new Error('file.read requires string parameter: path');
        }
        const safePath = validatePath(parameters.path);
        return await fs.readFile(safePath, "utf-8");
      }

      case "file.write": {
        if (!parameters.path || typeof parameters.path !== 'string') {
          throw new Error('file.write requires string parameter: path');
        }
        if (parameters.content === undefined || typeof parameters.content !== 'string') {
          throw new Error('file.write requires string parameter: content');
        }
        const safePath = validatePath(parameters.path);
        await fs.writeFile(safePath, parameters.content, "utf-8");
        return { success: true, path: safePath };
      }

      case "file.append": {
        const safePath = validatePath(parameters.path);
        await fs.appendFile(safePath, parameters.content, "utf-8");
        return { success: true, path: safePath };
      }

      case "file.delete": {
        const safePath = validatePath(parameters.path);
        await fs.unlink(safePath);
        return { success: true, deleted: safePath };
      }

      case "file.move": {
        const safeSource = validatePath(parameters.source);
        const safeDest = validatePath(parameters.destination);
        await fs.rename(safeSource, safeDest);
        return { success: true, from: safeSource, to: safeDest };
      }

      case "file.copy": {
        const safeSource = validatePath(parameters.source);
        const safeDest = validatePath(parameters.destination);
        await fs.copyFile(safeSource, safeDest);
        return { success: true, from: safeSource, to: safeDest };
      }

      case "file.list": {
        const safePath = validatePath(parameters.path);
        const files = await fs.readdir(safePath, { withFileTypes: true });
        if (parameters.recursive) {
          return await this.listRecursive(safePath);
        }
        return files.map((f) => ({
          name: f.name,
          isDirectory: f.isDirectory(),
          isFile: f.isFile(),
        }));
      }

      case "file.search": {
        const safePath = validatePath(parameters.path);
        const files = await this.searchFiles(safePath, parameters.pattern);
        return { matches: files };
      }

      case "file.get_info": {
        const safePath = validatePath(parameters.path);
        const stats = await fs.stat(safePath);
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

      case "file.set_permissions": {
        const safePath = validatePath(parameters.path);
        await fs.chmod(safePath, parseInt(parameters.permissions, 8));
        return { success: true, path: safePath };
      }

      case "directory.create": {
        const safePath = validatePath(parameters.path);
        await fs.mkdir(safePath, { recursive: parameters.recursive });
        return { success: true, path: safePath };
      }

      case "directory.delete": {
        const safePath = validatePath(parameters.path);
        await fs.rm(safePath, { recursive: true, force: true });
        return { success: true, deleted: safePath };
      }

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
