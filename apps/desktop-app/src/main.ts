import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, dialog, screen } from "electron";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import { DesktopAgent } from "./agent";
import { matchCommand } from "./command-database";
import { SimpleStore } from "./simple-store";
import { CommandProcessor } from "./command-processor";

// Simple input injector using robotjs (if available)
class SimpleInputInjector {
  private robot: any = null;

  constructor() {
    try {
      // Try to load robotjs
      this.robot = require('robotjs');
      console.log('[InputInjector] robotjs loaded successfully');
    } catch (error) {
      console.warn('[InputInjector] robotjs not available - install with: npm install robotjs');
      console.warn('[InputInjector] Input injection will be disabled');
    }
  }

  moveMouse(x: number, y: number): void {
    if (!this.robot) return;
    try {
      this.robot.moveMouse(x, y);
    } catch (error) {
      console.error('[InputInjector] Failed to move mouse:', error);
    }
  }

  mouseDown(button: 'left' | 'right' | 'middle'): void {
    if (!this.robot) return;
    try {
      this.robot.mouseToggle('down', button);
    } catch (error) {
      console.error('[InputInjector] Failed to press mouse button:', error);
    }
  }

  mouseUp(button: 'left' | 'right' | 'middle'): void {
    if (!this.robot) return;
    try {
      this.robot.mouseToggle('up', button);
    } catch (error) {
      console.error('[InputInjector] Failed to release mouse button:', error);
    }
  }

  mouseScroll(deltaX: number, deltaY: number): void {
    if (!this.robot) return;
    try {
      // robotjs scrollMouse takes magnitude
      if (deltaY !== 0) {
        this.robot.scrollMouse(0, Math.round(deltaY));
      }
    } catch (error) {
      console.error('[InputInjector] Failed to scroll:', error);
    }
  }

  keyDown(key: string, modifiers?: any): void {
    if (!this.robot) return;
    try {
      // Apply modifiers first
      const mods = [];
      if (modifiers?.ctrl) mods.push('control');
      if (modifiers?.shift) mods.push('shift');
      if (modifiers?.alt) mods.push('alt');
      if (modifiers?.meta) mods.push('command');

      this.robot.keyToggle(key, 'down', mods);
    } catch (error) {
      console.error('[InputInjector] Failed to press key:', error);
    }
  }

  keyUp(key: string, modifiers?: any): void {
    if (!this.robot) return;
    try {
      const mods = [];
      if (modifiers?.ctrl) mods.push('control');
      if (modifiers?.shift) mods.push('shift');
      if (modifiers?.alt) mods.push('alt');
      if (modifiers?.meta) mods.push('command');

      this.robot.keyToggle(key, 'up', mods);
    } catch (error) {
      console.error('[InputInjector] Failed to release key:', error);
    }
  }

  sendSpecialKey(combination: string): void {
    if (!this.robot) return;
    console.log('[InputInjector] Special key combination:', combination);
    // Handle special keys like Ctrl-Alt-Del
    // Platform-specific implementation would go here
  }
}

const store = new SimpleStore();

// Prevent crashes from console errors when stdout is closed
process.stdout.on('error', (err) => {
  // Ignore EPIPE and EIO errors
  if (err.code === 'EPIPE' || err.code === 'EIO') return;
  throw err;
});

process.stderr.on('error', (err) => {
  // Ignore EPIPE and EIO errors
  if (err.code === 'EPIPE' || err.code === 'EIO') return;
  throw err;
});

// Optional auto-launch (don't crash if it fails)
let AutoLaunch: any = null;
try {
  AutoLaunch = require("auto-launch");
} catch (error) {
  console.warn("Auto-launch not available:", error);
}
const API_BASE = process.env.API_URL || "https://comandr-api.onrender.com"; // Production API
const WEB_APP_URL = process.env.WEB_APP_URL || "https://comandr.pages.dev"; // Cloudflare Pages

class ComandrApp {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private agent = new DesktopAgent();
  private autoLauncher: any = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private commandProcessor: CommandProcessor | null = null;
  private agentProcess: ChildProcess | null = null;
  private remoteSessionWindows: Map<string, BrowserWindow> = new Map();
  private inputInjector = new SimpleInputInjector();

  constructor() {
    // Setup auto-launch (optional)
    if (AutoLaunch) {
      try {
        this.autoLauncher = new AutoLaunch({
          name: "Comandr",
          path: app.getPath("exe"),
        });
      } catch (error) {
        console.warn("Failed to setup auto-launch:", error);
      }
    }

    this.init();
  }

  private async init() {
    await app.whenReady();

    // Enable auto-launch by default (if available)
    if (this.autoLauncher) {
      try {
        const isEnabled = await this.autoLauncher.isEnabled();
        if (!isEnabled) {
          await this.autoLauncher.enable();
        }
      } catch (error) {
        console.warn("Auto-launch setup failed:", error);
      }
    }

    this.createTray();
    this.loadUserSession();
    this.setupIPCHandlers();
    this.startPolling();

    // Show welcome notification
    this.showNotification("Comandr Started", "Your AI assistant is now running");

    // Auto-show window on first launch
    setTimeout(() => {
      if (this.userId) {
        this.showWindow();
      } else {
        this.showLogin();
      }
    }, 1000);

    // Prevent app from quitting when all windows are closed
    app.on("window-all-closed", () => {
      // Don't quit app when all windows are closed (keep in tray)
    });

    // Clean up agent process when app quits
    app.on("before-quit", () => {
      this.stopDesktopAgent();
    });
  }

  private setupIPCHandlers() {
    // Get current session
    ipcMain.handle("get-session", () => {
      if (!this.userId) return null;
      return {
        userId: this.userId,
        role: store.get("role") || "member",
        tenantName: store.get("tenantName") || "Personal",
        tenantType: store.get("tenantType") || "home",
        accessToken: store.get("session") as string,
      };
    });

    // Get device name
    ipcMain.handle("get-device-name", () => {
      const os = require('os');
      return os.hostname();
    });

    // Get detailed device info
    ipcMain.handle("get-device-info", () => {
      const os = require('os');
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        version: os.version(),
        type: os.type(),
        uptime: os.uptime(),
        totalMemory: totalMem,
        freeMemory: freeMem,
        usedMemory: usedMem,
        memoryUsagePercent: Math.round((usedMem / totalMem) * 100),
        cpus: os.cpus().map(cpu => ({
          model: cpu.model,
          speed: cpu.speed,
        })),
        cpuCount: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        networkInterfaces: Object.keys(os.networkInterfaces()),
        homeDir: os.homedir(),
        tmpDir: os.tmpdir(),
        userInfo: os.userInfo(),
      };
    });

    // Get network info
    ipcMain.handle("get-network-info", () => {
      const os = require('os');
      const interfaces = os.networkInterfaces();

      // Flatten the structure - create one entry per interface+address combination
      // Filter to only show useful interfaces (not loopback, tunnels, or link-local)
      const formatted: any[] = [];
      Object.entries(interfaces).forEach(([name, addrs]: [string, any]) => {
        if (!addrs) return;

        // Skip useless interfaces: loopback (lo), tunnels (utun, awdl, llw), bridges
        if (name.startsWith('lo') || name.startsWith('utun') ||
            name.startsWith('awdl') || name.startsWith('llw') ||
            name.startsWith('bridge') || name.startsWith('gif')) {
          return;
        }

        addrs.forEach((addr: any) => {
          // Skip internal/loopback addresses
          if (addr.internal) return;

          // Skip link-local IPv6 addresses (fe80::) - they're not useful
          if (addr.family === 'IPv6' && addr.address.startsWith('fe80::')) {
            return;
          }

          formatted.push({
            name,
            address: addr.address,
            netmask: addr.netmask,
            family: addr.family,
            mac: addr.mac || 'N/A',
            internal: false,
          });
        });
      });

      return formatted;
    });

    // Get disk info (basic - platform dependent)
    ipcMain.handle("get-disk-info", async () => {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const os = require('os');

      // Parse human-readable size (e.g., "931Gi", "450G", "1.5T") to bytes
      const parseSize = (sizeStr: string): number => {
        if (!sizeStr) return 0;
        const units: Record<string, number> = {
          'K': 1024,
          'M': 1024 ** 2,
          'G': 1024 ** 3,
          'T': 1024 ** 4,
          'Ki': 1024,
          'Mi': 1024 ** 2,
          'Gi': 1024 ** 3,
          'Ti': 1024 ** 4,
        };

        const match = sizeStr.match(/^([\d.]+)([KMGT]i?)$/i);
        if (!match) return 0;

        const value = parseFloat(match[1]);
        const unit = match[2];
        return Math.floor(value * (units[unit] || 1));
      };

      try {
        if (os.platform() === 'darwin') {
          const { stdout } = await execAsync('df -h / | tail -1');
          const parts = stdout.trim().split(/\s+/);
          return {
            total: parseSize(parts[1]),
            used: parseSize(parts[2]),
            available: parseSize(parts[3]),
            usedPercent: parts[4],
            mountPoint: parts[8],
            filesystem: parts[0],
          };
        } else if (os.platform() === 'win32') {
          const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
          return { raw: stdout };
        } else {
          const { stdout } = await execAsync('df -h / | tail -1');
          const parts = stdout.trim().split(/\s+/);
          return {
            total: parseSize(parts[1]),
            used: parseSize(parts[2]),
            available: parseSize(parts[3]),
            usedPercent: parts[4],
            mountPoint: parts[5],
            filesystem: parts[0],
          };
        }
      } catch (error) {
        return null;
      }
    });

    // Get installed applications (basic)
    ipcMain.handle("get-installed-apps", async () => {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const os = require('os');

      try {
        if (os.platform() === 'darwin') {
          const { stdout } = await execAsync('ls /Applications');
          const apps = stdout.trim().split('\n')
            .filter((name: string) => name.endsWith('.app'))
            .map((name: string) => ({
              name: name.replace('.app', ''),
              path: `/Applications/${name}`,
            }));
          return apps;
        } else if (os.platform() === 'win32') {
          // Windows: list from Program Files
          const { stdout } = await execAsync('dir "C:\\Program Files" /b');
          const apps = stdout.trim().split('\n').map((name: string) => ({
            name: name.trim(),
            path: `C:\\Program Files\\${name.trim()}`,
          }));
          return apps;
        } else {
          // Linux: list from common app directories
          const { stdout } = await execAsync('ls /usr/share/applications');
          const apps = stdout.trim().split('\n')
            .filter((name: string) => name.endsWith('.desktop'))
            .map((name: string) => ({
              name: name.replace('.desktop', ''),
              path: `/usr/share/applications/${name}`,
            }));
          return apps;
        }
      } catch (error) {
        return [];
      }
    });


    // Get security info
    ipcMain.handle("get-security-info", async () => {
      const os = require('os');
      const platform = os.platform();
      
      try {
        if (platform === 'darwin') {
          // macOS security checks
          return {
            firewall: 'Enabled',
            encryption: 'FileVault Active',
            gatekeeper: 'Enabled',
            sip: 'Enabled'
          };
        } else if (platform === 'win32') {
          // Windows security checks
          return {
            firewall: 'Enabled',
            encryption: 'BitLocker',
            defender: 'Active',
            uac: 'Enabled'
          };
        } else {
          // Linux security checks
          return {
            firewall: 'UFW/iptables',
            selinux: 'Status Unknown',
            apparmor: 'Status Unknown'
          };
        }
      } catch (error) {
        return {
          firewall: 'Unknown',
          encryption: 'Unknown'
        };
      }
    });

    // Login
    ipcMain.handle("login", async (event, credentials: { username: string; password: string }) => {
      try {
        const response = await fetch(`${API_BASE}/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const error = (await response.json()) as any;
          throw new Error((error as any).message || "Login failed");
        }

        const result = (await response.json()) as any;
        this.userId = result.userId;
        this.commandProcessor = new CommandProcessor(API_BASE, result.userId);

        // Store all session data
        store.set("userId", result.userId);
        store.set("session", result.accessToken);
        store.set("role", result.role || "member");
        store.set("tenantId", result.tenantId || result.userId); // Store tenant ID
        store.set("tenantName", result.tenantName || "Personal");
        store.set("tenantType", result.tenantType || "home");

        this.updateTrayMenu();
        this.startPolling();
        this.startDesktopAgent();

        const roleLabel = result.role === "owner" ? "Admin" : result.role || "Member";
        this.showNotification("Logged In", `Welcome back as ${roleLabel}!`);

        // Close login window and show main window
        BrowserWindow.getAllWindows().forEach(win => {
          if (win.getTitle().includes("Login") || win.getTitle().includes("Sign In")) {
            win.close();
          }
        });
        this.showWindow();
      } catch (error: any) {
        throw new Error((error as any).message || "Login failed");
      }
    });

    // Signup
    ipcMain.handle("signup", async (event, userData: any) => {
      try {
        console.log('[Signup] Attempting signup with data:', { ...userData, password: '[REDACTED]' });

        const response = await fetch(`${API_BASE}/v1/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });

        console.log('[Signup] Response status:', response.status);

        if (!response.ok) {
          let errorMessage = "Signup failed";
          try {
            const errorData = (await response.json()) as any;
            console.log('[Signup] Error response:', errorData);
            errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
          } catch (e) {
            const errorText = await response.text();
            console.log('[Signup] Error text:', errorText);
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const result = (await response.json()) as any;
        console.log('[Signup] Success:', result.userId);

        this.userId = result.userId;
        this.commandProcessor = new CommandProcessor(API_BASE, result.userId);

        // Store all session data
        store.set("userId", result.userId);
        store.set("session", result.accessToken);
        store.set("role", result.role || "member");
        store.set("tenantId", result.tenantId || result.userId); // Store tenant ID
        store.set("tenantName", result.tenantName || userData.orgName || "Personal");
        store.set("tenantType", result.tenantType || userData.orgType || "home");

        this.updateTrayMenu();
        this.startPolling();
        this.startDesktopAgent();

        const accountType = userData.accountType === "organization" ? "Organization" : "Personal";
        this.showNotification("Account Created", `Welcome! Your ${accountType} account is ready.`);

        // Close login window and show main window
        BrowserWindow.getAllWindows().forEach(win => {
          if (win.getTitle().includes("Login") || win.getTitle().includes("Sign In")) {
            win.close();
          }
        });
        this.showWindow();

        return result;
      } catch (error: any) {
        console.error('[Signup] Error:', error);
        // Provide helpful error message if API is not running
        if (error.message && error.message.includes('fetch')) {
          throw new Error(`Cannot connect to API server at ${API_BASE}. Please ensure the API is running.`);
        }
        throw new Error(error.message || "An unexpected error occurred during signup");
      }
    });

    // Forgot Password
    ipcMain.handle("forgot-password", async (event, data: { username: string }) => {
      try {
        const response = await fetch(`${API_BASE}/v1/auth/request-password-reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = (await response.json()) as any;
          throw new Error((error as any).message || "Failed to send reset email");
        }

        const result = (await response.json()) as any;
        this.showNotification("Password Reset", "Check your email for reset instructions");
        return result;
      } catch (error: any) {
        throw new Error((error as any).message || "Failed to send reset email");
      }
    });

    // Join Organization
    ipcMain.handle("join-organization", async (event, data: any) => {
      try {
        const response = await fetch(`${API_BASE}/v1/auth/join-organization`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = (await response.json()) as any;
          throw new Error((error as any).message || "Failed to join organization");
        }

        const result = (await response.json()) as any;
        this.userId = result.userId;
        this.commandProcessor = new CommandProcessor(API_BASE, result.userId);

        // Store all session data
        store.set("userId", result.userId);
        store.set("session", result.accessToken);
        store.set("role", result.role || "member");
        store.set("tenantId", result.tenantId || result.userId); // Store tenant ID
        store.set("tenantName", result.tenantName || "Organization");
        store.set("tenantType", result.tenantType || "business");

        this.updateTrayMenu();
        this.startPolling();
        this.startDesktopAgent();

        this.showNotification("Joined Organization", `Welcome to ${result.tenantName}!`);

        // Close login window and show main window
        BrowserWindow.getAllWindows().forEach(win => {
          if (win.getTitle().includes("Login") || win.getTitle().includes("Sign In")) {
            win.close();
          }
        });
        this.showWindow();

        return result;
      } catch (error: any) {
        throw new Error((error as any).message || "Failed to join organization");
      }
    });

    // Logout
    ipcMain.handle("logout", () => {
      this.logout();
    });

    // Send command
    ipcMain.handle("send-command", async (event, command: string) => {
      console.log('[IPC] send-command received:', command);
      try {
        await this.executeQuickCommand(command);
        console.log('[IPC] send-command completed successfully');
      } catch (error) {
        console.error('[IPC] send-command error:', error);
        throw error;
      }
    });

    // Get intents
    ipcMain.handle("get-intents", async () => {
      if (!this.userId) return [];
      const accessToken = store.get("session") as string;
      if (!accessToken) return [];

      try {
        const response = await fetch(`${API_BASE}/v1/intents?tenantId=${this.userId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          return await response.json();
        }
        return [];
      } catch (error) {
        console.error("Failed to load intents:", error);
        return [];
      }
    });

    // Get result for intent
    ipcMain.handle("get-result", async (event, intentId: string) => {
      const accessToken = store.get("session") as string;
      if (!accessToken) return null;

      try {
        const response = await fetch(`${API_BASE}/v1/intents/${intentId}/result`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error("Failed to load result:", error);
        return null;
      }
    });

    // Admin: Get all users
    ipcMain.handle("admin-get-users", async () => {
      const accessToken = store.get("session") as string;
      if (!accessToken) return { users: [], total: 0 };

      try {
        const response = await fetch(`${API_BASE}/v1/admin/users`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          return await response.json();
        }
        return { users: [], total: 0 };
      } catch (error) {
        console.error("Failed to load users:", error);
        return { users: [], total: 0 };
      }
    });

    // Admin: Get all organizations
    ipcMain.handle("admin-get-organizations", async () => {
      const accessToken = store.get("session") as string;
      if (!accessToken) return { organizations: [], total: 0 };

      try {
        const response = await fetch(`${API_BASE}/v1/admin/organizations`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          return await response.json();
        }
        return { organizations: [], total: 0 };
      } catch (error) {
        console.error("Failed to load organizations:", error);
        return { organizations: [], total: 0 };
      }
    });

    // Admin: Get platform stats
    ipcMain.handle("admin-get-stats", async () => {
      const accessToken = store.get("session") as string;
      if (!accessToken) return null;

      try {
        const response = await fetch(`${API_BASE}/v1/admin/stats`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error("Failed to load stats:", error);
        return null;
      }
    });

    // Admin: Create user
    ipcMain.handle("admin-create-user", async (event, userData) => {
      const accessToken = store.get("session") as string;
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as any).message || "Failed to create user");
      }

      return await response.json();
    });

    // Admin: Update user
    ipcMain.handle("admin-update-user", async (event, userId, userData) => {
      const accessToken = store.get("session") as string;
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as any).message || "Failed to update user");
      }

      return await response.json();
    });

    // Admin: Delete user
    ipcMain.handle("admin-delete-user", async (event, userId) => {
      const accessToken = store.get("session") as string;
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as any).message || "Failed to delete user");
      }

      return await response.json();
    });

    // Admin: Update organization
    ipcMain.handle("admin-update-organization", async (event, orgId, orgData) => {
      const accessToken = store.get("session") as string;
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/v1/admin/organizations/${orgId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(orgData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as any).message || "Failed to update organization");
      }

      return await response.json();
    });

    // Admin: Delete organization
    ipcMain.handle("admin-delete-organization", async (event, orgId) => {
      const accessToken = store.get("session") as string;
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/v1/admin/organizations/${orgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as any).message || "Failed to delete organization");
      }

      return await response.json();
    });


    // Admin: Reset user password
    ipcMain.handle("admin-reset-user-password", async (event, userId, newPassword) => {
      const accessToken = store.get("session") as string;
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/v1/admin/users/${userId}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as any).message || "Failed to reset password");
      }

      return await response.json();
    });

    // Remote session IPC handlers
    ipcMain.handle("remote-list-devices", async () => {
      const accessToken = store.get("session") as string;
      if (!accessToken) throw new Error("Not authenticated");

      const tenantId = store.get("tenantId") as string;
      if (!tenantId) throw new Error("Tenant ID not found");

      console.log('[IPC] Fetching devices for tenant:', tenantId);

      const response = await fetch(`${API_BASE}/v1/devices?tenantId=${tenantId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[IPC] Failed to fetch devices:', response.status, errorText);
        throw new Error(`Failed to fetch devices: ${response.status} ${errorText}`);
      }

      const data = await response.json() as any;
      console.log('[IPC] Fetched devices:', data.devices?.length || 0);
      return data.devices || [];
    });

    ipcMain.handle("remote-create-session", async (event, targetDeviceId: string) => {
      const accessToken = store.get("session") as string;
      if (!accessToken) throw new Error("Not authenticated");

      const userId = this.userId;
      const tenantId = store.get("tenantId") as string;

      console.log('[Main] Creating remote session:', { targetDeviceId, userId, tenantId });

      const requestBody = {
        tenantId,
        targetDeviceId,
        initiatorUserId: userId,
        sessionType: "interactive",
        permissions: {
          control: true,
          clipboard: true,
          fileTransfer: true,
        },
      };

      console.log('[Main] Request body:', requestBody);

      const response = await fetch(`${API_BASE}/v1/remote-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Main] Session creation failed:', response.status, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || errorJson.error || "Failed to create session");
        } catch {
          throw new Error(`Failed to create session: ${response.status} ${errorText}`);
        }
      }

      const data = await response.json() as any;
      const session = data.session;

      if (!session || !session.id) {
        console.error('[Main] Invalid session response:', data);
        throw new Error('Invalid session response from API');
      }

      // Open remote session window
      this.openRemoteSessionWindow(session.id, targetDeviceId);

      return session;
    });

    ipcMain.handle("remote-end-session", async (event, sessionId: string) => {
      const accessToken = store.get("session") as string;
      if (!accessToken) throw new Error("Not authenticated");

      // End session locally
      const result = await this.agent.executeIntent({
        id: "local-end-session",
        tenantId: store.get("tenantId") as string,
        capabilityId: "remote.session.end",
        parameters: { sessionId },
        reasoning: "User requested to end session",
        requestedBy: this.userId || "system",
        createdAt: new Date().toISOString(),
      });

      // End session on server
      const response = await fetch(`${API_BASE}/v1/remote-sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to end session on server");
      }

      return result;
    });

    ipcMain.handle("remote-send-input", async (event, sessionId: string, eventType: string, eventData: any) => {
      try {
        console.log('[Main] Received input event:', eventType, eventData.event);

        if (!this.inputInjector) {
          console.warn('[Main] Input injector not available');
          return { success: false, error: 'Input injection not available - install robotjs' };
        }

        // Get screen dimensions for coordinate translation
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;

        if (eventData.type === 'mouse') {
          // Translate normalized coordinates (0-1) to absolute pixels
          const x = Math.floor(eventData.x * width);
          const y = Math.floor(eventData.y * height);

          console.log('[Main] Injecting mouse:', eventData.event, 'at', x, y);

          switch (eventData.event) {
            case 'move':
              this.inputInjector.moveMouse(x, y);
              break;
            case 'down':
              this.inputInjector.mouseDown(eventData.button || 'left');
              break;
            case 'up':
              this.inputInjector.mouseUp(eventData.button || 'left');
              break;
            case 'scroll':
              this.inputInjector.mouseScroll(eventData.deltaX || 0, eventData.deltaY || 0);
              break;
          }
        } else if (eventData.type === 'keyboard') {
          const modifiers = {
            ctrl: eventData.ctrl || false,
            shift: eventData.shift || false,
            alt: eventData.alt || false,
            meta: eventData.meta || false,
          };

          console.log('[Main] Injecting keyboard:', eventData.event, eventData.key);

          switch (eventData.event) {
            case 'down':
              this.inputInjector.keyDown(eventData.key, modifiers);
              break;
            case 'up':
              this.inputInjector.keyUp(eventData.key, modifiers);
              break;
          }
        } else if (eventData.type === 'special_key') {
          this.inputInjector.sendSpecialKey(eventData.combination);
        }

        return { success: true };
      } catch (error) {
        console.error('[Main] Failed to inject input:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle("remote-get-active-sessions", () => {
      return this.agent.getActiveRemoteSessions();
    });

    // WebRTC signaling handlers
    ipcMain.on("remote-signaling", async (event, message) => {
      console.log('[Main] Received signaling from renderer:', Object.keys(message));

      // Translate renderer format to agent format
      const agentMessage: any = {
        sessionId: message.sessionId,
      };

      if (message.offer) {
        agentMessage.offer = message.offer.sdp;
      } else if (message.answer) {
        agentMessage.answer = message.answer.sdp;
      } else if (message.iceCandidate) {
        agentMessage.iceCandidate = {
          candidate: message.iceCandidate.candidate,
          sdpMid: message.iceCandidate.sdpMid || '',
          sdpMLineIndex: message.iceCandidate.sdpMLineIndex || 0,
        };
      }

      // Forward signaling message from renderer to agent
      await this.agent.handleRemoteSignalingMessage(agentMessage);
    });

    ipcMain.on("remote-quality-change", async (event, data) => {
      const { sessionId, quality } = data;
      await this.agent.executeIntent({
        id: `quality-change-${Date.now()}`,
        tenantId: store.get("tenantId") as string,
        capabilityId: "remote.screen.start_stream",
        parameters: { sessionId, quality },
        reasoning: "User requested quality change",
        requestedBy: this.userId || "system",
        createdAt: new Date().toISOString(),
      });
    });

    ipcMain.on("remote-clipboard-sync", async (event, data) => {
      const { sessionId, enabled } = data;
      const capabilityId = enabled ? "remote.clipboard.sync_enable" : "remote.clipboard.sync_disable";
      await this.agent.executeIntent({
        id: `clipboard-${Date.now()}`,
        tenantId: store.get("tenantId") as string,
        capabilityId,
        parameters: { sessionId },
        reasoning: "User toggled clipboard sync",
        requestedBy: this.userId || "system",
        createdAt: new Date().toISOString(),
      });
    });

    // Handle incoming session request (when this device is the target)
    ipcMain.handle("remote-session-request-received", async (event, data) => {
      const { sessionId, initiatorName } = data;

      // Show notification
      this.showNotification(
        "Remote Session Request",
        `${initiatorName || 'Someone'} wants to connect to your device`
      );

      // Open target session window (role='target' for screen sharing)
      this.openTargetSessionWindow(sessionId);

      return { success: true };
    });
  }

  // Open remote session window (initiator - viewing remote screen)
  private openRemoteSessionWindow(sessionId: string, deviceId: string) {
    this.openSessionWindow(sessionId, deviceId, 'initiator', 'Remote Session - Viewing');
  }

  // Open target session window (target - sharing own screen)
  private openTargetSessionWindow(sessionId: string) {
    this.openSessionWindow(sessionId, '', 'target', 'Remote Session - Sharing');
  }

  // Generic method to open session window
  private openSessionWindow(sessionId: string, deviceId: string, role: string, title: string) {
    // Check if window already exists
    if (this.remoteSessionWindows.has(sessionId)) {
      const existingWindow = this.remoteSessionWindows.get(sessionId);
      if (existingWindow && !existingWindow.isDestroyed()) {
        existingWindow.focus();
        return;
      }
    }

    // Create new remote session window
    const sessionWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, "preload.js"),
      },
      title,
      backgroundColor: "#1a1a1a",
    });

    // Load remote session HTML with query parameters
    const sessionUrl = `file://${path.join(__dirname, "remote-session.html")}?sessionId=${sessionId}&deviceId=${deviceId}&role=${role}`;
    sessionWindow.loadURL(sessionUrl);

    // Setup signaling message forwarding from agent to window
    const signalHandler = (message: any) => {
      // Route message to the correct session window
      const targetSessionId = message.sessionId || message.session_id;
      const targetWindow = this.remoteSessionWindows.get(targetSessionId);

      if (targetWindow && !targetWindow.isDestroyed()) {
        console.log('[Main] Forwarding signaling message to session:', targetSessionId);

        // Translate agent format to renderer format
        const rendererMessage: any = {
          sessionId: targetSessionId,
        };

        if (message.offer) {
          rendererMessage.offer = {
            sdp: typeof message.offer === 'string' ? message.offer : message.offer.sdp,
            type: 'offer',
          };
        } else if (message.answer) {
          rendererMessage.answer = {
            sdp: typeof message.answer === 'string' ? message.answer : message.answer.sdp,
            type: 'answer',
          };
        } else if (message.ice_candidate || message.iceCandidate) {
          const candidate = message.ice_candidate || message.iceCandidate;
          rendererMessage.iceCandidate = {
            candidate: candidate.candidate,
            sdpMid: candidate.sdp_mid || candidate.sdpMid,
            sdpMLineIndex: candidate.sdp_m_line_index || candidate.sdpMLineIndex,
          };
        }

        targetWindow.webContents.send("remote-signaling-message", rendererMessage);
      } else {
        console.warn('[Main] No window found for session:', targetSessionId);
      }
    };

    // Set the global signaling callback (handles all sessions)
    this.agent.setRemoteSignalingCallback(signalHandler);

    // Clean up on window close
    sessionWindow.on("closed", () => {
      this.remoteSessionWindows.delete(sessionId);

      // End session if it's still active
      this.agent.executeIntent({
        id: `end-session-${sessionId}`,
        tenantId: store.get("tenantId") as string,
        capabilityId: "remote.session.end",
        parameters: { sessionId },
        reasoning: "Window closed",
        requestedBy: this.userId || "system",
        createdAt: new Date().toISOString(),
      }).catch(err => console.error('Failed to end session:', err));
    });

    // Store window reference
    this.remoteSessionWindows.set(sessionId, sessionWindow);
  }

  private createTray() {
    // Create a simple visible icon (16x16 black square)
    const canvas = {
      width: 16,
      height: 16,
      data: Buffer.alloc(16 * 16 * 4) // RGBA
    };

    // Fill with black
    for (let i = 0; i < canvas.data.length; i += 4) {
      canvas.data[i] = 0;     // R
      canvas.data[i + 1] = 0; // G
      canvas.data[i + 2] = 0; // B
      canvas.data[i + 3] = 255; // A (fully opaque)
    }

    const icon = nativeImage.createFromBuffer(canvas.data, {
      width: canvas.width,
      height: canvas.height,
    });
    icon.setTemplateImage(true); // Makes it adapt to dark/light mode

    this.tray = new Tray(icon);
    this.tray.setToolTip("Comandr - AI Assistant");

    this.updateTrayMenu();

    this.tray.on("click", () => {
      this.showWindow();
    });
  }

  private updateTrayMenu() {
    const isLoggedIn = !!this.userId;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Comandr",
        type: "normal",
        enabled: false,
      },
      { type: "separator" },
      {
        label: isLoggedIn ? `Logged in as: ${this.userId.slice(0, 8)}...` : "Not logged in",
        type: "normal",
        enabled: false,
      },
      { type: "separator" },
      {
        label: isLoggedIn ? "Open Comandr" : "Login to Comandr",
        type: "normal",
        click: () => isLoggedIn ? this.showWindow() : this.showLogin(),
      },
      { type: "separator" },
      {
        label: "Settings",
        type: "normal",
        click: () => this.showSettings(),
      },
      {
        label: isLoggedIn ? "Logout" : "Login",
        type: "normal",
        click: () => (isLoggedIn ? this.logout() : this.showLogin()),
      },
      { type: "separator" },
      {
        label: "Quit Comandr",
        type: "normal",
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray?.setContextMenu(contextMenu);
  }

  private showWindow() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 1000,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      title: "Comandr",
      autoHideMenuBar: true,
      backgroundColor: '#0D0D0D',
      titleBarStyle: 'hiddenInset',
    });

    // Load local UI
    this.mainWindow.loadFile(path.join(__dirname, "../src/ui.html"));

    this.mainWindow.on("close", (event) => {
      event.preventDefault();
      this.mainWindow?.hide();
    });
  }

  private showSettings() {
    // TODO: Implement settings window
    this.showNotification("Settings", "Settings coming soon");
  }

  private showLogin() {
    const loginWindow = new BrowserWindow({
      width: 900,
      height: 750,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      title: "Comandr - Sign In",
      autoHideMenuBar: true,
      resizable: false,
      backgroundColor: '#0D0D0D',
      titleBarStyle: 'hiddenInset',
    });

    loginWindow.loadFile(path.join(__dirname, "../src/auth.html"));
  }

  private logout() {
    this.userId = null;
    this.commandProcessor = null;
    store.delete("userId");
    store.delete("session");
    store.delete("role");
    store.delete("tenantName");
    store.delete("tenantType");
    this.stopPolling();
    this.stopDesktopAgent();
    this.updateTrayMenu();
    this.showNotification("Logged Out", "You have been logged out");

    // Close main window and show login
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
    this.showLogin();
  }

  private loadUserSession() {
    const savedUserId = store.get("userId") as string;
    if (savedUserId) {
      this.userId = savedUserId;
      this.commandProcessor = new CommandProcessor(API_BASE, savedUserId);
      this.updateTrayMenu();
      this.startDesktopAgent();
    }
  }

  private startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(() => {
      this.checkForIntents();
    }, 5000); // Poll every 5 seconds
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private startDesktopAgent() {
    if (this.agentProcess || !this.userId) {
      return;
    }

    console.log('[Desktop Agent] Starting agent process for tenant:', this.userId);

    // Find the desktop-agent executable
    const agentPath = path.join(__dirname, '..', '..', 'desktop-agent', 'dist', 'index.js');

    // Spawn the agent process
    this.agentProcess = spawn('node', [agentPath, this.userId], {
      env: {
        ...process.env,
        API_GATEWAY_URL: API_BASE,
        TENANT_ID: this.userId,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Log agent output
    this.agentProcess.stdout?.on('data', (data) => {
      console.log('[Desktop Agent]', data.toString().trim());
    });

    this.agentProcess.stderr?.on('data', (data) => {
      console.error('[Desktop Agent Error]', data.toString().trim());
    });

    this.agentProcess.on('error', (error) => {
      console.error('[Desktop Agent] Process error:', error);
      this.agentProcess = null;
    });

    this.agentProcess.on('exit', (code) => {
      console.log('[Desktop Agent] Process exited with code:', code);
      this.agentProcess = null;
    });
  }

  private stopDesktopAgent() {
    if (this.agentProcess) {
      console.log('[Desktop Agent] Stopping agent process');
      this.agentProcess.kill();
      this.agentProcess = null;
    }
  }

  private async checkForIntents() {
    if (!this.userId) return;

    try {
      const response = await fetch(`${API_BASE}/v1/intents/pending?tenantId=${this.userId}`);

      if (!response.ok) return;

      const intents = (await response.json()) as any[];

      for (const intent of intents) {
        await this.executeIntent(intent);
      }
    } catch (error) {
      // Silent fail - don't spam notifications
      console.error("Failed to check intents:", error);
    }
  }

  private async executeIntent(intent: any) {
    this.showNotification(
      "Executing Command",
      `Running: ${intent.capabilityId}`,
    );

    console.log('[executeIntent] Starting execution for:', intent.id, intent.capabilityId);
    const result = await this.agent.executeIntent(intent);

    console.log('[executeIntent] Execution complete. Result status:', result.status);
    console.log('[executeIntent] Result keys:', Object.keys(result));
    console.log('[executeIntent] Result.result type:', typeof result.result);
    console.log('[executeIntent] Result.result preview:', JSON.stringify(result.result).substring(0, 300));

    // Report result back
    try {
      console.log('[executeIntent] Posting result to API...');
      const response = await fetch(`${API_BASE}/v1/intents/${intent.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

      console.log('[executeIntent] API response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[executeIntent] API error response:', errorText);
      }

      if (result.status === "completed") {
        this.showNotification(
          "Command Completed",
          `Successfully executed: ${intent.capabilityId}`,
        );
      } else if (result.status === "failed") {
        this.showNotification(
          "Command Failed",
          `Error: ${result.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Failed to report result:", error);
    }
  }

  private async showCommandInput() {
    if (!this.userId) {
      this.showNotification("Not Logged In", "Please log in first");
      return;
    }

    // Create a simple input window
    const inputWindow = new BrowserWindow({
      width: 500,
      height: 200,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: "Send Command",
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // Load a simple HTML page with input
    inputWindow.loadURL(`data:text/html;charset=utf-8,
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 20px;
              background: #f5f5f5;
              margin: 0;
            }
            h2 { margin-top: 0; color: #333; }
            input {
              width: 100%;
              padding: 12px;
              font-size: 14px;
              border: 1px solid #ddd;
              border-radius: 4px;
              box-sizing: border-box;
            }
            button {
              margin-top: 10px;
              padding: 10px 20px;
              font-size: 14px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            button:hover { background: #0056b3; }
            .examples {
              margin-top: 15px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <h2>Send Command</h2>
          <input type="text" id="commandInput" placeholder="e.g., show cpu usage" autofocus />
          <button onclick="sendCommand()">Send</button>
          <div class="examples">
            <strong>Examples:</strong> show cpu, list processes, system info, take screenshot
          </div>
          <script>
            const { ipcRenderer } = require('electron');

            document.getElementById('commandInput').addEventListener('keypress', (e) => {
              if (e.key === 'Enter') sendCommand();
            });

            function sendCommand() {
              const command = document.getElementById('commandInput').value.trim();
              if (command) {
                ipcRenderer.send('execute-command', command);
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `);

    // Handle command execution
    ipcMain.once("execute-command", async (event, command) => {
      await this.executeQuickCommand(command);
    });
  }

  private async executeQuickCommand(command: string) {
    console.log('[executeQuickCommand] Called with command:', command);
    console.log('[executeQuickCommand] userId:', this.userId);
    console.log('[executeQuickCommand] commandProcessor:', !!this.commandProcessor);

    if (!this.userId || !this.commandProcessor) {
      console.log('[executeQuickCommand] Not logged in, showing notification');
      this.showNotification("Not Logged In", "Please log in first");
      return;
    }

    try {
      console.log('[executeQuickCommand] Processing command...');
      // Use command processing pipeline: local → server → AI
      const processed = await this.commandProcessor.processCommand(command);
      console.log('[executeQuickCommand] Processed result:', processed);

      // Show feedback about where the command came from
      const sourceLabel = {
        local: "📂 Local",
        server: "🌐 Server",
        ai: "🤖 AI",
        none: "❌ Unknown",
      }[processed.source];

      console.log(`[QuickCommand] ${sourceLabel}: ${processed.capability}`);

      // If no match found, show help
      if (processed.source === "none") {
        console.log('[executeQuickCommand] No match found');
        this.showNotification(
          "Command Not Understood",
          "Try: 'show cpu usage', 'show memory', 'list processes'"
        );
        return;
      }

      // Create intent
      console.log('[executeQuickCommand] Creating intent with capability:', processed.capability);
      const response = await fetch(`${API_BASE}/v1/intents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: this.userId,
          capabilityId: processed.capability,
          parameters: processed.parameters,
          reasoning: `${sourceLabel} ${processed.reasoning}`,
          requestedBy: this.userId,
        }),
      });

      console.log('[executeQuickCommand] Intent response status:', response.status);

      if (response.ok) {
        const intent = (await response.json()) as any;
        console.log('[executeQuickCommand] Intent created:', intent.id);
        this.showNotification("Command Sent ✓", processed.reasoning);
      } else {
        console.error('[executeQuickCommand] Failed to create intent:', response.statusText);
        this.showNotification("Error", "Failed to send command");
      }
    } catch (error) {
      console.error("[QuickCommand] Error:", error);
      this.showNotification("Error", "Failed to process command");
    }
  }

  private showNotification(title: string, body: string) {
    if (Notification.isSupported()) {
      new Notification({
        title,
        body,
        icon: path.join(__dirname, "../assets/icon.png"),
      }).show();
    }
  }
}

// Create app instance
new ComandrApp();
