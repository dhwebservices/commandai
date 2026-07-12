import { matchCommand } from "./command-database";

export interface ProcessedCommand {
  capability: string;
  parameters: Record<string, any>;
  reasoning: string;
  source: "local" | "server" | "ai" | "none";
}

export class CommandProcessor {
  constructor(
    private readonly apiBase: string,
    private readonly tenantId: string,
  ) {}

  async processCommand(query: string): Promise<ProcessedCommand> {
    console.log(`[CommandProcessor] Processing: "${query}"`);

    // Stage 1: Try local command database
    const localMatch = matchCommand(query);
    if (localMatch) {
      console.log(`[CommandProcessor] ✅ Matched locally: ${localMatch.capability}`);
      return {
        capability: localMatch.capability,
        parameters: localMatch.parameters,
        reasoning: localMatch.description,
        source: "local",
      };
    }

    console.log(`[CommandProcessor] ⚠️ No local match, trying server...`);

    // Stage 2: Try server command registry
    try {
      const serverMatch = await this.tryServerMatch(query);
      if (serverMatch) {
        console.log(`[CommandProcessor] ✅ Matched from server: ${serverMatch.capability}`);
        return serverMatch;
      }
    } catch (error) {
      console.error(`[CommandProcessor] Server match failed:`, error);
    }

    console.log(`[CommandProcessor] ⚠️ No server match, trying AI...`);

    // Stage 3: Try AI (if available)
    try {
      const aiMatch = await this.tryAIMatch(query);
      if (aiMatch) {
        console.log(`[CommandProcessor] ✅ AI matched: ${aiMatch.capability}`);
        return aiMatch;
      }
    } catch (error) {
      console.error(`[CommandProcessor] AI match failed:`, error);
    }

    // Stage 4: Nothing matched
    console.log(`[CommandProcessor] ❌ No match found for: "${query}"`);
    return {
      capability: "system.help",
      parameters: {
        message: "Command not recognized. Try 'show cpu', 'list processes', 'system info'",
      },
      reasoning: "Command not found in local database, server registry, or AI",
      source: "none",
    };
  }

  private async tryServerMatch(query: string): Promise<ProcessedCommand | null> {
    const response = await fetch(`${this.apiBase}/v1/commands/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        tenantId: this.tenantId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server match failed: ${response.status}`);
    }

    const data = (await response.json()) as any;

    if (data.matched && data.command) {
      return {
        capability: data.command.capabilityId,
        parameters: data.command.parameters,
        reasoning: data.command.description,
        source: "server",
      };
    }

    return null;
  }

  private async tryAIMatch(query: string): Promise<ProcessedCommand | null> {
    const response = await fetch(`${this.apiBase}/v1/ai/generate-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: query,
        tenantId: this.tenantId,
        userId: this.tenantId, // For now, use tenantId as userId
      }),
    });

    if (!response.ok) {
      throw new Error(`AI match failed: ${response.status}`);
    }

    const data = (await response.json()) as any;

    // If AI returns system.help, it means AI is not available
    if (data.capabilityId === "system.help") {
      return null;
    }

    return {
      capability: data.capabilityId,
      parameters: data.parameters,
      reasoning: data.reasoning,
      source: "ai",
    };
  }
}
