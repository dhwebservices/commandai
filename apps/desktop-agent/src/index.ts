#!/usr/bin/env node

import { DesktopAgent } from "./agent.js";
import type { Intent, ActionResult } from "./agent.js";

// Export for use as a library
export { DesktopAgent };
export type { Intent, ActionResult };

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:3000";
const POLL_INTERVAL = 5000; // Poll every 5 seconds

class AgentRunner {
  private agent = new DesktopAgent();
  private tenantId: string;
  private agentId: string;
  private accessToken?: string;
  private running = true;

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
