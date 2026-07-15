#!/usr/bin/env node

import { DesktopAgent } from "./agent.js";
import type { Intent, ActionResult } from "./agent.js";
import os from "node:os";
import { networkInterfaces } from "node:os";

// Export for use as a library
export { DesktopAgent };
export type { Intent, ActionResult };

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:3000";
const POLL_INTERVAL = 5000; // Poll every 5 seconds
const HEARTBEAT_INTERVAL = 15000; // Send heartbeat every 15 seconds

class AgentRunner {
  private agent = new DesktopAgent();
  private tenantId: string;
  private agentId: string;
  private accessToken?: string;
  private running = true;
  private deviceRegistered = false;

  constructor(tenantId: string, agentId: string) {
    this.tenantId = tenantId;
    this.agentId = agentId;
  }

  async start() {
    console.log("[AgentRunner] Starting CommandAI Desktop Agent");
    console.log(`[AgentRunner] Tenant: ${this.tenantId}`);
    console.log(`[AgentRunner] Agent: ${this.agentId}`);
    console.log(`[AgentRunner] API Gateway: ${API_GATEWAY_URL}`);
    console.log("[AgentRunner] Supported capabilities:", this.agent.getCapabilities().length);

    // Register device on startup
    await this.registerDevice();

    // Start heartbeat loop
    this.startHeartbeatLoop();

    // Main loop: poll for intents and execute them
    while (this.running) {
      try {
        await this.pollAndExecute();
      } catch (error: any) {
        console.error("[AgentRunner] Error in main loop:", error.message);
      }

      await this.sleep(POLL_INTERVAL);
    }
  }

  private async registerDevice() {
    try {
      const deviceInfo = this.getDeviceInfo();

      const response = await fetch(`${API_GATEWAY_URL}/v1/devices/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: this.agentId,
          tenant_id: this.tenantId,
          hostname: deviceInfo.hostname,
          os_type: deviceInfo.os_type,
          os_version: deviceInfo.os_version,
          primary_ip: deviceInfo.primary_ip,
          capabilities: deviceInfo.capabilities,
          device_metadata: deviceInfo.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register device: ${response.status}`);
      }

      const result = await response.json();
      this.deviceRegistered = true;
      console.log("[AgentRunner] Device registered successfully:", result.device.id);
    } catch (error: any) {
      console.error("[AgentRunner] Failed to register device:", error.message);
      // Don't fail startup if registration fails - will retry on next heartbeat
    }
  }

  private startHeartbeatLoop() {
    setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error: any) {
        console.error("[AgentRunner] Heartbeat failed:", error.message);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private async sendHeartbeat() {
    const deviceInfo = this.getDeviceInfo();

    const response = await fetch(`${API_GATEWAY_URL}/v1/devices/${this.agentId}/presence`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "online",
        last_known_ip: deviceInfo.primary_ip,
      }),
    });

    if (!response.ok) {
      // If device not found, try to register it
      if (response.status === 404 && !this.deviceRegistered) {
        await this.registerDevice();
      } else {
        throw new Error(`Heartbeat failed: ${response.status}`);
      }
    }
  }

  private getDeviceInfo() {
    // Map process.platform to our OS types
    const platformMap: Record<string, "macos" | "windows" | "linux"> = {
      darwin: "macos",
      win32: "windows",
      linux: "linux",
    };
    const os_type = platformMap[process.platform] || "linux";

    // Get primary IP address
    const interfaces = networkInterfaces();
    let primary_ip: string | undefined;

    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;

      for (const addr of iface) {
        // Skip internal and non-IPv4 addresses
        if (!addr.internal && addr.family === "IPv4") {
          primary_ip = addr.address;
          break;
        }
      }
      if (primary_ip) break;
    }

    // Device capabilities (what features are available)
    const capabilities = {
      screenCapture: true,
      audioCapture: os_type !== "linux", // Audio capture more complex on Linux
      remoteControl: true,
      fileTransfer: true,
      terminal: true,
    };

    // Device metadata
    const metadata = {
      cpu: os.cpus()[0]?.model || "Unknown",
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + " GB",
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    };

    return {
      hostname: os.hostname(),
      os_type,
      os_version: os.release(),
      primary_ip,
      capabilities,
      metadata,
    };
  }

  private async pollAndExecute() {
    // In Phase 1, we'll use a simple REST API polling approach
    // Phase 2 will use the agent-gateway gRPC streaming (requires mTLS setup)

    try {
      const response = await fetch(`${API_GATEWAY_URL}/v1/intents/pending?tenantId=${this.tenantId}`);

      if (!response.ok) {
        if (response.status === 404) {
          // No pending intents
          return;
        }
        throw new Error(`Failed to fetch intents: ${response.status}`);
      }

      const intents: Intent[] = await response.json();

      if (intents.length === 0) {
        return;
      }

      console.log(`[AgentRunner] Found ${intents.length} pending intent(s)`);

      for (const intent of intents) {
        await this.executeAndReport(intent);
      }
    } catch (error: any) {
      console.error("[AgentRunner] Failed to poll intents:", error.message);
    }
  }

  private async executeAndReport(intent: Intent) {
    console.log(`[AgentRunner] Executing intent: ${intent.capabilityId}`);

    // Execute the intent
    const result = await this.agent.executeIntent(intent);

    console.log(`[AgentRunner] Intent ${intent.id} ${result.status}`);

    // Report the result back to the API
    try {
      const response = await fetch(`${API_GATEWAY_URL}/v1/intents/${intent.id}/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        console.error(`[AgentRunner] Failed to report result: ${response.status}`);
      }
    } catch (error: any) {
      console.error("[AgentRunner] Failed to report result:", error.message);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stop() {
    this.running = false;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const tenantId = args[0] || process.env.TENANT_ID;
const agentId = args[1] || process.env.AGENT_ID || "local-agent";

if (!tenantId) {
  console.error("Usage: desktop-agent <tenantId> [agentId]");
  console.error("Or set TENANT_ID environment variable");
  process.exit(1);
}

// Start the agent
const runner = new AgentRunner(tenantId, agentId);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[AgentRunner] Shutting down...");
  runner.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[AgentRunner] Shutting down...");
  runner.stop();
  process.exit(0);
});

runner.start().catch((error) => {
  console.error("[AgentRunner] Fatal error:", error);
  process.exit(1);
});
