/**
 * Massive command database for natural language to capability mapping
 * 500+ PATTERNS - NO AI REQUIRED
 * Pure pattern matching and keyword detection
 */

export interface CommandPattern {
  patterns: string[];
  capabilityId: string;
  extractParams: (input: string) => Record<string, any>;
  description: string;
  riskLevel?: 'safe' | 'warning' | 'danger' | 'critical';
  requiresConfirmation?: boolean;
}

export const COMMAND_DATABASE: CommandPattern[] = [
  // ===== SYSTEM INFORMATION =====
  {
    patterns: [
      "show system info", "system information", "tell me about my system",
      "what system am i running", "my computer info", "pc info", "mac info",
      "show me system details", "computer details", "hardware info"
    ],
    capabilityId: "system.info",
    extractParams: () => ({}),
    description: "Get system information"
  },
  {
    patterns: [
      "cpu usage", "show cpu", "processor usage", "how much cpu",
      "cpu load", "check cpu", "cpu stats", "cpu performance",
      "show processor", "what's my cpu usage"
    ],
    capabilityId: "system.cpu.usage",
    extractParams: () => ({}),
    description: "Get CPU usage statistics"
  },
  {
    patterns: [
      "memory usage", "ram usage", "how much memory", "show memory",
      "check ram", "memory stats", "how much ram", "ram stats",
      "show ram", "memory available", "free memory", "free ram"
    ],
    capabilityId: "system.memory.usage",
    extractParams: () => ({}),
    description: "Get memory usage statistics"
  },
  {
    patterns: [
      "disk usage", "disk space", "how much space", "storage usage",
      "hard drive space", "check disk", "show disk space", "free space",
      "available storage", "disk stats", "storage stats", "drive space"
    ],
    capabilityId: "system.disk.usage",
    extractParams: () => ({}),
    description: "Get disk usage statistics"
  },
  {
    patterns: [
      "network interfaces", "show network", "network adapters", "network cards",
      "ethernet info", "wifi info", "network connections", "ip addresses",
      "show interfaces", "network settings"
    ],
    capabilityId: "system.network.interfaces",
    extractParams: () => ({}),
    description: "Get network interface information"
  },
  {
    patterns: [
      "uptime", "how long running", "system uptime", "been running",
      "how long has system been on", "time since boot", "last reboot"
    ],
    capabilityId: "system.uptime",
    extractParams: () => ({}),
    description: "Get system uptime"
  },

  // ===== PROCESS MANAGEMENT =====
  {
    patterns: [
      "list processes", "show processes", "running processes", "all processes",
      "what's running", "show running programs", "active processes",
      "process list", "ps", "task list", "running tasks"
    ],
    capabilityId: "process.list",
    extractParams: () => ({}),
    description: "List all running processes"
  },
  {
    patterns: [
      "kill process", "terminate process", "end process", "stop process",
      "kill pid", "force quit process"
    ],
    capabilityId: "process.kill",
    extractParams: (input) => {
      const pidMatch = input.match(/\d+/);
      return { pid: pidMatch ? parseInt(pidMatch[0]) : 0 };
    },
    description: "Kill a process by PID"
  },

  // ===== APPLICATION MANAGEMENT =====
  {
    patterns: [
      "launch", "open", "start", "run app", "open app", "start app"
    ],
    capabilityId: "app.launch",
    extractParams: (input) => {
      const appNames = [
        "safari", "chrome", "firefox", "edge", "brave",
        "mail", "messages", "facetime", "calendar", "notes",
        "reminders", "photos", "music", "tv", "podcasts",
        "finder", "terminal", "iterm", "vscode", "code",
        "slack", "discord", "spotify", "zoom", "teams",
        "word", "excel", "powerpoint", "outlook", "onenote",
        "photoshop", "illustrator", "figma", "sketch",
        "xcode", "android studio", "intellij", "pycharm"
      ];

      const inputLower = input.toLowerCase();
      for (const app of appNames) {
        if (inputLower.includes(app)) {
          return { name: app.charAt(0).toUpperCase() + app.slice(1) };
        }
      }

      // Extract app name after "open" or "launch"
      const match = input.match(/(?:open|launch|start|run)\s+(\w+)/i);
      return { name: match ? match[1] : "" };
    },
    description: "Launch an application"
  },
  {
    patterns: [
      "quit", "close app", "exit", "stop app", "kill app", "close program"
    ],
    capabilityId: "app.quit",
    extractParams: (input) => {
      const appNames = [
        "safari", "chrome", "firefox", "edge", "brave",
        "mail", "messages", "facetime", "slack", "discord",
        "spotify", "zoom", "teams", "word", "excel"
      ];

      const inputLower = input.toLowerCase();
      for (const app of appNames) {
        if (inputLower.includes(app)) {
          return { name: app.charAt(0).toUpperCase() + app.slice(1) };
        }
      }

      const match = input.match(/(?:quit|close|exit|stop|kill)\s+(\w+)/i);
      return { name: match ? match[1] : "" };
    },
    description: "Quit an application"
  },
  {
    patterns: [
      "list apps", "show apps", "installed apps", "all applications",
      "what apps", "application list", "installed programs", "programs list"
    ],
    capabilityId: "app.list",
    extractParams: () => ({}),
    description: "List installed applications"
  },
  {
    patterns: [
      "running apps", "open apps", "active apps", "apps running now",
      "what apps are open", "currently running", "open applications"
    ],
    capabilityId: "app.list_running",
    extractParams: () => ({}),
    description: "List running applications"
  },

  // ===== FILE OPERATIONS =====
  {
    patterns: [
      "list files", "show files", "ls", "dir", "files in", "show directory"
    ],
    capabilityId: "file.list",
    extractParams: (input) => {
      const pathMatch = input.match(/(?:in|at)\s+([~\/][\w\/\-\.]+)/i);
      const recursive = input.includes("recursive") || input.includes("all files");
      return {
        path: pathMatch ? pathMatch[1] : ".",
        recursive
      };
    },
    description: "List files in a directory"
  },
  {
    patterns: [
      "read file", "show file", "cat", "view file", "open file for reading",
      "file contents", "read"
    ],
    capabilityId: "file.read",
    extractParams: (input) => {
      const pathMatch = input.match(/(?:read|cat|view|show)\s+(?:file\s+)?([~\/][\w\/\-\.]+)/i);
      return { path: pathMatch ? pathMatch[1] : "" };
    },
    description: "Read file contents"
  },
  {
    patterns: [
      "create file", "write file", "make file", "new file", "touch"
    ],
    capabilityId: "file.write",
    extractParams: (input) => {
      const pathMatch = input.match(/(?:create|write|make|new)\s+(?:file\s+)?([~\/][\w\/\-\.]+)/i);
      return { path: pathMatch ? pathMatch[1] : "", content: "" };
    },
    description: "Create or write a file"
  },
  {
    patterns: [
      "delete file", "remove file", "rm", "erase file", "delete"
    ],
    capabilityId: "file.delete",
    extractParams: (input) => {
      const pathMatch = input.match(/(?:delete|remove|rm|erase)\s+(?:file\s+)?([~\/][\w\/\-\.]+)/i);
      return { path: pathMatch ? pathMatch[1] : "" };
    },
    description: "Delete a file"
  },
  {
    patterns: [
      "copy file", "cp", "duplicate file", "copy"
    ],
    capabilityId: "file.copy",
    extractParams: (input) => {
      const match = input.match(/(?:copy|cp)\s+([~\/][\w\/\-\.]+)\s+(?:to\s+)?([~\/][\w\/\-\.]+)/i);
      return {
        source: match ? match[1] : "",
        destination: match ? match[2] : ""
      };
    },
    description: "Copy a file"
  },
  {
    patterns: [
      "move file", "mv", "rename file", "rename"
    ],
    capabilityId: "file.move",
    extractParams: (input) => {
      const match = input.match(/(?:move|mv|rename)\s+([~\/][\w\/\-\.]+)\s+(?:to\s+)?([~\/][\w\/\-\.]+)/i);
      return {
        source: match ? match[1] : "",
        destination: match ? match[2] : ""
      };
    },
    description: "Move or rename a file"
  },
  {
    patterns: [
      "search files", "find files", "locate files", "search for"
    ],
    capabilityId: "file.search",
    extractParams: (input) => {
      const patternMatch = input.match(/(?:search|find|locate)\s+(?:files?\s+)?(?:for\s+)?['"]?(\w+)['"]?/i);
      const pathMatch = input.match(/(?:in|at)\s+([~\/][\w\/\-\.]+)/i);
      return {
        path: pathMatch ? pathMatch[1] : ".",
        pattern: patternMatch ? patternMatch[1] : "*"
      };
    },
    description: "Search for files"
  },
  {
    patterns: [
      "file info", "stat", "file details", "file size", "file properties"
    ],
    capabilityId: "file.get_info",
    extractParams: (input) => {
      const pathMatch = input.match(/(?:info|stat|details|size|properties)\s+(?:of\s+)?(?:file\s+)?([~\/][\w\/\-\.]+)/i);
      return { path: pathMatch ? pathMatch[1] : "" };
    },
    description: "Get file information"
  },

  // ===== DIRECTORY OPERATIONS =====
  {
    patterns: [
      "create folder", "make folder", "mkdir", "new folder", "create directory",
      "make directory", "new directory"
    ],
    capabilityId: "directory.create",
    extractParams: (input) => {
      const pathMatch = input.match(/(?:create|make|mkdir|new)\s+(?:folder|directory)\s+(?:called\s+)?([~\/]?[\w\/\-\.]+)/i);
      return {
        path: pathMatch ? pathMatch[1] : "",
        recursive: true
      };
    },
    description: "Create a new directory"
  },
  {
    patterns: [
      "delete folder", "remove folder", "rmdir", "delete directory",
      "remove directory", "erase folder"
    ],
    capabilityId: "directory.delete",
    extractParams: (input) => {
      const pathMatch = input.match(/(?:delete|remove|rmdir|erase)\s+(?:folder|directory)\s+([~\/][\w\/\-\.]+)/i);
      return { path: pathMatch ? pathMatch[1] : "" };
    },
    description: "Delete a directory"
  },

  // ===== NETWORK OPERATIONS =====
  {
    patterns: [
      "ping", "ping host", "check connection", "test connection"
    ],
    capabilityId: "network.ping",
    extractParams: (input) => {
      const hostMatch = input.match(/ping\s+([\w\.\-]+)/i);
      const countMatch = input.match(/(\d+)\s+times?/i);
      return {
        host: hostMatch ? hostMatch[1] : "google.com",
        count: countMatch ? parseInt(countMatch[1]) : 4
      };
    },
    description: "Ping a network host"
  },
  {
    patterns: [
      "dns lookup", "resolve", "nslookup", "dig", "hostname lookup"
    ],
    capabilityId: "network.dns_lookup",
    extractParams: (input) => {
      const hostMatch = input.match(/(?:dns|resolve|nslookup|dig)\s+([\w\.\-]+)/i);
      return { hostname: hostMatch ? hostMatch[1] : "" };
    },
    description: "DNS lookup"
  },
  {
    patterns: [
      "download", "download file", "get file", "fetch file"
    ],
    capabilityId: "network.download",
    extractParams: (input) => {
      const urlMatch = input.match(/(https?:\/\/[^\s]+)/i);
      const destMatch = input.match(/(?:to|at|save)\s+([~\/][\w\/\-\.]+)/i);
      return {
        url: urlMatch ? urlMatch[1] : "",
        destination: destMatch ? destMatch[1] : "~/Downloads/file"
      };
    },
    description: "Download a file"
  },

  // ===== CLIPBOARD OPERATIONS =====
  {
    patterns: [
      "copy to clipboard", "clipboard write", "copy text", "put in clipboard"
    ],
    capabilityId: "clipboard.write",
    extractParams: (input) => {
      const textMatch = input.match(/(?:copy|write)\s+['"](.+)['"]/i);
      return { text: textMatch ? textMatch[1] : "" };
    },
    description: "Write to clipboard"
  },
  {
    patterns: [
      "read clipboard", "clipboard contents", "what's in clipboard",
      "show clipboard", "paste", "get clipboard"
    ],
    capabilityId: "clipboard.read",
    extractParams: () => ({}),
    description: "Read clipboard contents"
  },

  // ===== SCREENSHOT OPERATIONS =====
  {
    patterns: [
      "screenshot", "take screenshot", "screen capture", "capture screen",
      "take picture of screen", "screengrab"
    ],
    capabilityId: "screenshot.capture",
    extractParams: (input) => {
      const pathMatch = input.match(/(?:to|at|save)\s+([~\/][\w\/\-\.]+\.(?:png|jpg|jpeg))/i);
      const defaultPath = `~/Desktop/screenshot-${Date.now()}.png`;
      return { path: pathMatch ? pathMatch[1] : defaultPath };
    },
    description: "Capture screenshot"
  },

  // ===== TEXT OPERATIONS =====
  {
    patterns: [
      "search in file", "grep", "find in file", "search text"
    ],
    capabilityId: "text.search_in_file",
    extractParams: (input) => {
      const patternMatch = input.match(/(?:search|grep|find)\s+['"](.+)['"]?\s+in/i);
      const fileMatch = input.match(/in\s+([~\/][\w\/\-\.]+)/i);
      return {
        path: fileMatch ? fileMatch[1] : "",
        pattern: patternMatch ? patternMatch[1] : "",
        regex: false
      };
    },
    description: "Search for text in file"
  },
  {
    patterns: [
      "replace in file", "find and replace", "sed", "substitute in file"
    ],
    capabilityId: "text.replace_in_file",
    extractParams: (input) => {
      const match = input.match(/replace\s+['"](.+)['"]\s+with\s+['"](.+)['"]?\s+in\s+([~\/][\w\/\-\.]+)/i);
      return {
        path: match ? match[3] : "",
        find: match ? match[1] : "",
        replace: match ? match[2] : "",
        regex: false
      };
    },
    description: "Find and replace text in file"
  },

  // ===== SYSTEM POWER =====
  {
    patterns: [
      "shutdown", "shut down", "turn off", "power off", "shutdown computer"
    ],
    capabilityId: "system.shutdown",
    extractParams: (input) => {
      const delayMatch = input.match(/in\s+(\d+)\s+(?:seconds?|minutes?)/i);
      return { delay: delayMatch ? parseInt(delayMatch[1]) * 60 : 0 };
    },
    description: "Shutdown the system"
  },
  {
    patterns: [
      "restart", "reboot", "restart computer", "reboot system"
    ],
    capabilityId: "system.restart",
    extractParams: (input) => {
      const delayMatch = input.match(/in\s+(\d+)\s+(?:seconds?|minutes?)/i);
      return { delay: delayMatch ? parseInt(delayMatch[1]) * 60 : 0 };
    },
    description: "Restart the system"
  },
  {
    patterns: [
      "sleep", "put to sleep", "sleep mode", "suspend"
    ],
    capabilityId: "system.sleep",
    extractParams: () => ({}),
    description: "Put system to sleep"
  }
];

/**
 * Match user input to a capability without AI
 * Pure pattern matching and keyword detection
 */
export function matchCommand(input: string): {
  capability: string;
  parameters: Record<string, any>;
  confidence: number;
  description: string;
} | null {
  const inputLower = input.toLowerCase().trim();

  // Try exact pattern matches first
  for (const cmd of COMMAND_DATABASE) {
    for (const pattern of cmd.patterns) {
      if (inputLower.includes(pattern.toLowerCase())) {
        return {
          capability: cmd.capabilityId,
          parameters: cmd.extractParams(input),
          confidence: 1.0,
          description: cmd.description
        };
      }
    }
  }

  // Try fuzzy matching for common variations
  for (const cmd of COMMAND_DATABASE) {
    for (const pattern of cmd.patterns) {
      const similarity = calculateSimilarity(inputLower, pattern.toLowerCase());
      if (similarity > 0.7) {
        return {
          capability: cmd.capabilityId,
          parameters: cmd.extractParams(input),
          confidence: similarity,
          description: cmd.description
        };
      }
    }
  }

  return null;
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);

  let matches = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matches++;
    }
  }

  return matches / Math.max(words1.length, words2.length);
}

/**
 * Get suggestions for partial input
 */
export function getSuggestions(partial: string): string[] {
  const partialLower = partial.toLowerCase();
  const suggestions: string[] = [];

  for (const cmd of COMMAND_DATABASE) {
    for (const pattern of cmd.patterns) {
      if (pattern.toLowerCase().startsWith(partialLower) ||
          pattern.toLowerCase().includes(partialLower)) {
        suggestions.push(pattern);
        if (suggestions.length >= 5) return suggestions;
      }
    }
  }

  return suggestions;
}

// Import extended commands
import { EXTENDED_COMMANDS } from './command-database-extended';

// Merge basic and extended commands
const ALL_COMMANDS = [...COMMAND_DATABASE, ...EXTENDED_COMMANDS.map(cmd => ({
  patterns: cmd.patterns,
  capabilityId: cmd.capabilityId,
  extractParams: cmd.extractParams,
  description: cmd.description,
  riskLevel: cmd.riskLevel,
  requiresConfirmation: cmd.requiresConfirmation
}))];

// Update matchCommand to use ALL_COMMANDS
export function matchCommandV2(input: string): {
  capability: string;
  parameters: Record<string, any>;
  confidence: number;
  description: string;
  riskLevel?: string;
  requiresConfirmation?: boolean;
} | null {
  const inputLower = input.toLowerCase().trim();

  // Try exact pattern matches first
  for (const cmd of ALL_COMMANDS) {
    for (const pattern of cmd.patterns) {
      if (inputLower.includes(pattern.toLowerCase())) {
        return {
          capability: cmd.capabilityId,
          parameters: cmd.extractParams(input),
          confidence: 1.0,
          description: cmd.description,
          riskLevel: cmd.riskLevel,
          requiresConfirmation: cmd.requiresConfirmation
        };
      }
    }
  }

  // Try fuzzy matching
  for (const cmd of ALL_COMMANDS) {
    for (const pattern of cmd.patterns) {
      const similarity = calculateSimilarity(inputLower, pattern.toLowerCase());
      if (similarity > 0.7) {
        return {
          capability: cmd.capabilityId,
          parameters: cmd.extractParams(input),
          confidence: similarity,
          description: cmd.description,
          riskLevel: cmd.riskLevel,
          requiresConfirmation: cmd.requiresConfirmation
        };
      }
    }
  }

  return null;
}

// Export total command count for tracking
export const TOTAL_COMMANDS = ALL_COMMANDS.length;
export const TOTAL_PATTERNS = ALL_COMMANDS.reduce((sum, cmd) => sum + cmd.patterns.length, 0);
