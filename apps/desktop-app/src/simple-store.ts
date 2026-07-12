/**
 * Simple JSON file storage - replaces electron-store
 * No external dependencies
 */

import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

export class SimpleStore {
  private storePath: string;
  private data: Record<string, any> = {};

  constructor() {
    const userDataPath = app.getPath("userData");
    this.storePath = path.join(userDataPath, "config.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.storePath)) {
        const fileData = fs.readFileSync(this.storePath, "utf8");
        this.data = JSON.parse(fileData);
      }
    } catch (error) {
      console.error("Failed to load store:", error);
      this.data = {};
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error("Failed to save store:", error);
    }
  }

  get(key: string, defaultValue?: any): any {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key: string, value: any): void {
    this.data[key] = value;
    this.save();
  }

  has(key: string): boolean {
    return this.data[key] !== undefined;
  }

  delete(key: string): void {
    delete this.data[key];
    this.save();
  }

  clear(): void {
    this.data = {};
    this.save();
  }
}
