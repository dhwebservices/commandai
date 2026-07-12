import { Body, Controller, Post } from "@nestjs/common";
import { loadApiGatewayConfig } from "../../config";

interface AIRequest {
  tenantId: string;
  prompt: string;
  userId: string;
}

interface Intent {
  capabilityId: string;
  parameters: Record<string, any>;
  reasoning: string;
}

/**
 * AI Orchestration controller - uses Claude/Anthropic API to convert natural
 * language requests into structured intents.
 */
@Controller({ path: "ai", version: "1" })
export class AIController {
  private readonly anthropicApiKey: string;

  constructor() {
    const config = loadApiGatewayConfig();
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || "";

    if (!this.anthropicApiKey) {
      console.warn("[AI] ANTHROPIC_API_KEY not set - AI features will not work");
    }
  }

  @Post("generate-intent")
  async generateIntent(@Body() body: AIRequest): Promise<Intent> {
    if (!this.anthropicApiKey) {
      throw new Error("AI features not configured - ANTHROPIC_API_KEY missing");
    }

    console.log(`[AI] Generating intent for prompt: ${body.prompt}`);

    const capabilities = this.getAvailableCapabilities();
    const systemPrompt = this.buildSystemPrompt(capabilities);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: body.prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse the JSON response
    const intent = JSON.parse(content);

    console.log(`[AI] Generated intent: ${intent.capabilityId}`);

    return intent;
  }

  private getAvailableCapabilities(): string[] {
    return [
      "file.read", "file.write", "file.delete", "file.list", "file.search",
      "directory.create", "directory.delete",
      "system.cpu.usage", "system.memory.usage", "system.disk.usage", "system.info",
      "process.list", "process.kill", "process.start",
      "app.launch", "app.quit", "app.list",
      "network.ping", "network.download",
      "clipboard.read", "clipboard.write",
      "screenshot.capture",
    ];
  }

  private buildSystemPrompt(capabilities: string[]): string {
    return `You are an AI agent orchestrator for CommandAI, a system automation platform.

Your job is to convert natural language requests into structured intents that can be executed by the desktop agent.

Available capabilities:
${capabilities.map(c => `- ${c}`).join("\n")}

Capability descriptions:
- file.read: Read file contents (parameters: {path: string})
- file.write: Write to a file (parameters: {path: string, content: string})
- file.delete: Delete a file (parameters: {path: string})
- file.list: List files in directory (parameters: {path: string, recursive?: boolean})
- file.search: Search for files (parameters: {path: string, pattern: string})
- directory.create: Create directory (parameters: {path: string, recursive?: boolean})
- directory.delete: Delete directory (parameters: {path: string})
- system.cpu.usage: Get CPU usage stats (parameters: {})
- system.memory.usage: Get memory usage (parameters: {})
- system.disk.usage: Get disk usage (parameters: {path?: string})
- system.info: Get system information (parameters: {})
- process.list: List running processes (parameters: {})
- process.kill: Kill a process (parameters: {pid: number})
- process.start: Start a process (parameters: {command: string, args?: string[]})
- app.launch: Launch an application (parameters: {name: string, args?: string[]})
- app.quit: Quit an application (parameters: {name: string})
- app.list: List installed applications (parameters: {})
- network.ping: Ping a host (parameters: {host: string, count?: number})
- network.download: Download a file (parameters: {url: string, destination: string})
- clipboard.read: Read clipboard contents (parameters: {})
- clipboard.write: Write to clipboard (parameters: {text: string})
- screenshot.capture: Capture screenshot (parameters: {path: string})

When given a user request, respond with a JSON object in this EXACT format:
{
  "capabilityId": "the.capability.id",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "reasoning": "Brief explanation of why this capability was chosen and what it will do"
}

Examples:

User: "Show me my CPU usage"
{
  "capabilityId": "system.cpu.usage",
  "parameters": {},
  "reasoning": "User wants to see CPU usage statistics. The system.cpu.usage capability will return current CPU usage for all cores."
}

User: "Delete the file /tmp/test.txt"
{
  "capabilityId": "file.delete",
  "parameters": {
    "path": "/tmp/test.txt"
  },
  "reasoning": "User wants to delete a specific file. The file.delete capability will permanently remove the file at the given path."
}

User: "Create a new folder called 'projects' in my home directory"
{
  "capabilityId": "directory.create",
  "parameters": {
    "path": "~/projects",
    "recursive": true
  },
  "reasoning": "User wants to create a new directory. The directory.create capability will create the 'projects' folder in the home directory."
}

IMPORTANT:
- Only respond with the JSON object, no additional text
- Choose the most appropriate single capability for the request
- Fill in all required parameters
- Use realistic, safe values
- If the request is unclear or unsafe, choose a read-only capability that provides information
- Always provide clear reasoning

Now, convert the user's request into an intent:`;
  }
}
