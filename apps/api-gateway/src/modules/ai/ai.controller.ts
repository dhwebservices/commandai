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
    console.log(`[AI] Generating intent for prompt: "${body.prompt}"`);

    // FIRST: Try command database (no API key needed! FREE!)
    const dbMatch = this.matchFromDatabase(body.prompt);
    if (dbMatch) {
      console.log(`[AI] ✅ MATCHED FROM DATABASE: ${dbMatch.capabilityId} (no AI needed)`);
      return dbMatch;
    }

    console.log(`[AI] ⚠️ No database match, falling back to AI...`);

    // SECOND: Fall back to AI if configured
    if (!this.anthropicApiKey) {
      throw new Error(
        "❌ Could not match command from database and ANTHROPIC_API_KEY not set for AI fallback. Command not recognized."
      );
    }

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

  private matchFromDatabase(prompt: string): Intent | null {
    // Import command database matching logic
    const PATTERNS: Array<{ keywords: string[]; capability: string; extract: (s: string) => any }> = [
      // System commands
      {
        keywords: ["cpu usage", "processor usage", "show cpu"],
        capability: "system.cpu.usage",
        extract: () => ({}),
      },
      {
        keywords: ["memory usage", "ram usage", "show memory", "show ram"],
        capability: "system.memory.usage",
        extract: () => ({}),
      },
      {
        keywords: ["disk usage", "disk space", "storage", "hard drive space"],
        capability: "system.disk.usage",
        extract: () => ({}),
      },
      {
        keywords: ["system info", "system information", "computer info"],
        capability: "system.info",
        extract: () => ({}),
      },
      {
        keywords: ["uptime", "how long running"],
        capability: "system.uptime",
        extract: () => ({}),
      },
      {
        keywords: ["network interfaces", "show network", "ip address"],
        capability: "system.network.interfaces",
        extract: () => ({}),
      },
      // Process commands
      {
        keywords: ["list processes", "show processes", "running processes", "ps"],
        capability: "process.list",
        extract: () => ({}),
      },
      // App commands
      {
        keywords: ["list apps", "show apps", "installed apps"],
        capability: "app.list",
        extract: () => ({}),
      },
      {
        keywords: ["running apps", "open apps"],
        capability: "app.list_running",
        extract: () => ({}),
      },
      // File commands
      {
        keywords: ["list files", "show files", "ls"],
        capability: "file.list",
        extract: (s) => {
          const match = s.match(/in\s+([\w\/\.~]+)/);
          return { path: match ? match[1] : ".", recursive: false };
        },
      },
      // Screenshot
      {
        keywords: ["screenshot", "screen capture", "take screenshot"],
        capability: "screenshot.capture",
        extract: () => ({ path: `~/Desktop/screenshot-${Date.now()}.png` }),
      },
      // Clipboard
      {
        keywords: ["clipboard", "show clipboard", "paste"],
        capability: "clipboard.read",
        extract: () => ({}),
      },
      // Git commands
      {
        keywords: ["git status", "repository status", "git st"],
        capability: "git.status",
        extract: () => ({}),
      },
      {
        keywords: ["git push", "push to remote", "push changes"],
        capability: "git.push",
        extract: () => ({ branch: "main", force: false }),
      },
      {
        keywords: ["git pull", "pull from remote", "update from remote"],
        capability: "git.pull",
        extract: () => ({ rebase: false }),
      },
      {
        keywords: ["git commit", "commit changes"],
        capability: "git.commit",
        extract: (s) => {
          const message = s.match(/['"](.+?)['"]/)?.[1] || "Update";
          return { message, all: false };
        },
      },
      // Docker commands
      {
        keywords: ["docker ps", "list containers", "running containers"],
        capability: "docker.ps",
        extract: () => ({ all: false }),
      },
      {
        keywords: ["docker images", "list images"],
        capability: "docker.images",
        extract: () => ({}),
      },
      {
        keywords: ["docker logs", "container logs"],
        capability: "docker.logs",
        extract: (s) => {
          const container = s.match(/logs?\s+([\w\-]+)/i)?.[1] || "";
          return { container, follow: false };
        },
      },
      // macOS specific
      {
        keywords: ["show hidden files", "reveal hidden files"],
        capability: "macos.finder.show_hidden",
        extract: () => ({}),
      },
      {
        keywords: ["caffeinate", "prevent sleep"],
        capability: "macos.power.management",
        extract: () => ({ action: "caffeinate", duration: 3600 }),
      },
      {
        keywords: ["purge memory", "clear ram", "free memory"],
        capability: "macos.purge",
        extract: () => ({}),
      },
      // Windows specific
      {
        keywords: ["battery report", "power report"],
        capability: "windows.powercfg",
        extract: () => ({ operation: "batteryreport" }),
      },
      {
        keywords: ["system file checker", "sfc scan"],
        capability: "windows.sfc",
        extract: () => ({ operation: "scannow" }),
      },
      // Network diagnostics
      {
        keywords: ["traceroute", "trace route", "tracert"],
        capability: "network.traceroute",
        extract: (s) => {
          const host = s.match(/(?:traceroute|trace)\s+([\w\.\-]+)/i)?.[1] || "google.com";
          return { host };
        },
      },
      {
        keywords: ["netstat", "network connections", "listening ports"],
        capability: "network.netstat",
        extract: () => ({ listening: false }),
      },
    ];

    const promptLower = prompt.toLowerCase();

    for (const pattern of PATTERNS) {
      if (pattern.keywords.some((kw) => promptLower.includes(kw))) {
        return {
          capabilityId: pattern.capability,
          parameters: pattern.extract(prompt),
          reasoning: `Matched from command database for: ${pattern.capability}`,
        };
      }
    }

    return null;
  }

  private buildSystemPrompt(capabilities: string[]): string {
    return `You are an AI agent orchestrator for Comandr, a system automation platform.

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
