import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, dialog } from "electron";
import * as path from "path";
import { DesktopAgent } from "./agent";
import { matchCommand } from "./command-database";
import { SimpleStore } from "./simple-store";
import { CommandProcessor } from "./command-processor";

const store = new SimpleStore();

// Optional auto-launch (don't crash if it fails)
let AutoLaunch: any = null;
try {
  AutoLaunch = require("auto-launch");
} catch (error) {
  console.warn("Auto-launch not available:", error);
}
const API_BASE = process.env.API_URL || "https://commandai-4l50.onrender.com"; // Render API
const WEB_APP_URL = process.env.WEB_APP_URL || "https://comandr.pages.dev"; // Cloudflare Pages

class ComandrApp {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private agent = new DesktopAgent();
  private autoLauncher: any = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private commandProcessor: CommandProcessor | null = null;

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
    this.startPolling();

    // Show welcome notification
    this.showNotification("Comandr Started", "Your AI assistant is now running");

    // Auto-show window on first launch
    setTimeout(() => this.showWindow(), 1000);

    // Prevent app from quitting when all windows are closed
    app.on("window-all-closed", (e) => {
      e.preventDefault();
    });
  }

  private createTray() {
    // Create tray icon (use default if custom icon not found)
    const iconPath = path.join(__dirname, "../assets/icon.png");
    let icon: any;

    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        // Use default Electron icon
        icon = nativeImage.createEmpty();
      }
    } catch {
      icon = nativeImage.createEmpty();
    }

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
        label: "Open Dashboard",
        type: "normal",
        click: () => this.showWindow(),
      },
      {
        label: "Send Command...",
        type: "normal",
        enabled: isLoggedIn,
        click: () => this.showCommandInput(),
      },
      {
        label: "Quick Commands",
        type: "submenu",
        enabled: isLoggedIn,
        submenu: [
          {
            label: "Show System Info",
            click: () => this.executeQuickCommand("show system info"),
          },
          {
            label: "Show CPU Usage",
            click: () => this.executeQuickCommand("show cpu usage"),
          },
          {
            label: "Show Memory Usage",
            click: () => this.executeQuickCommand("show memory usage"),
          },
          {
            label: "Show Disk Usage",
            click: () => this.executeQuickCommand("show disk usage"),
          },
          {
            label: "List Processes",
            click: () => this.executeQuickCommand("list processes"),
          },
        ],
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
      width: 1000,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
      title: "Comandr",
      autoHideMenuBar: true,
    });

    // Load the web console
    this.mainWindow.loadURL(WEB_APP_URL);

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
    this.showWindow();
  }

  private logout() {
    this.userId = null;
    store.delete("userId");
    store.delete("session");
    this.stopPolling();
    this.updateTrayMenu();
    this.showNotification("Logged Out", "You have been logged out");
  }

  private loadUserSession() {
    const savedUserId = store.get("userId") as string;
    if (savedUserId) {
      this.userId = savedUserId;
      this.commandProcessor = new CommandProcessor(API_BASE, savedUserId);
      this.updateTrayMenu();
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

    const result = await this.agent.executeIntent(intent);

    // Report result back
    try {
      await fetch(`${API_BASE}/v1/intents/${intent.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

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
    if (!this.userId || !this.commandProcessor) {
      this.showNotification("Not Logged In", "Please log in first");
      return;
    }

    try {
      // Use command processing pipeline: local → server → AI
      const processed = await this.commandProcessor.processCommand(command);

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
        this.showNotification("Command Not Found", processed.parameters.message || "Try: show cpu, list processes");
        return;
      }

      // Create intent
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

      if (response.ok) {
        this.showNotification("Command Sent", `${sourceLabel} ${processed.reasoning}`);
      } else {
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
