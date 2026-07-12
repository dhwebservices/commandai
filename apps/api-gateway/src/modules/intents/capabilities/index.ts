import type { Capability } from "@commandai/schema";

/**
 * Comprehensive capability registry for Mac and Windows system operations.
 * Each capability maps to a safe, validated operation with proper parameter schemas.
 * Risk levels: read (safe), mutate (changes state), destructive (irreversible).
 */

// File System Capabilities
export const FILE_CAPABILITIES: Record<string, Capability> = {
  "file.read": {
    id: "file.read",
    name: "Read File",
    description: "Read contents of a file",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string" },
  },
  "file.write": {
    id: "file.write",
    name: "Write File",
    description: "Write or overwrite a file",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string", content: "string" },
  },
  "file.append": {
    id: "file.append",
    name: "Append to File",
    description: "Append content to an existing file",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string", content: "string" },
  },
  "file.delete": {
    id: "file.delete",
    name: "Delete File",
    description: "Permanently delete a file",
    riskLevel: "destructive",
    requiresConfirmation: true,
    parameterSchema: { path: "string" },
  },
  "file.move": {
    id: "file.move",
    name: "Move File",
    description: "Move or rename a file",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { source: "string", destination: "string" },
  },
  "file.copy": {
    id: "file.copy",
    name: "Copy File",
    description: "Copy a file to a new location",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { source: "string", destination: "string" },
  },
  "file.list": {
    id: "file.list",
    name: "List Files",
    description: "List files in a directory",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string", recursive: "boolean?" },
  },
  "file.search": {
    id: "file.search",
    name: "Search Files",
    description: "Search for files by name or pattern",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string", pattern: "string" },
  },
  "file.get_info": {
    id: "file.get_info",
    name: "Get File Info",
    description: "Get file metadata (size, modified date, permissions)",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string" },
  },
  "file.set_permissions": {
    id: "file.set_permissions",
    name: "Set File Permissions",
    description: "Change file permissions (chmod)",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string", permissions: "string" },
  },
  "directory.create": {
    id: "directory.create",
    name: "Create Directory",
    description: "Create a new directory",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string", recursive: "boolean?" },
  },
  "directory.delete": {
    id: "directory.delete",
    name: "Delete Directory",
    description: "Delete a directory and its contents",
    riskLevel: "destructive",
    requiresConfirmation: true,
    parameterSchema: { path: "string" },
  },
};

// Process Management Capabilities
export const PROCESS_CAPABILITIES: Record<string, Capability> = {
  "process.list": {
    id: "process.list",
    name: "List Processes",
    description: "List all running processes",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "process.get_info": {
    id: "process.get_info",
    name: "Get Process Info",
    description: "Get detailed information about a process",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { pid: "number" },
  },
  "process.kill": {
    id: "process.kill",
    name: "Kill Process",
    description: "Terminate a running process",
    riskLevel: "destructive",
    requiresConfirmation: true,
    parameterSchema: { pid: "number", signal: "string?" },
  },
  "process.start": {
    id: "process.start",
    name: "Start Process",
    description: "Start a new process or application",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { command: "string", args: "array?" },
  },
};

// System Information Capabilities
export const SYSTEM_CAPABILITIES: Record<string, Capability> = {
  "system.cpu.usage": {
    id: "system.cpu.usage",
    name: "Get CPU Usage",
    description: "Get current CPU usage statistics",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "system.memory.usage": {
    id: "system.memory.usage",
    name: "Get Memory Usage",
    description: "Get current memory usage statistics",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "system.disk.usage": {
    id: "system.disk.usage",
    name: "Get Disk Usage",
    description: "Get disk space usage for all drives",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string?" },
  },
  "system.network.interfaces": {
    id: "system.network.interfaces",
    name: "Get Network Interfaces",
    description: "List all network interfaces and their status",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "system.info": {
    id: "system.info",
    name: "Get System Info",
    description: "Get operating system and hardware information",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "system.uptime": {
    id: "system.uptime",
    name: "Get System Uptime",
    description: "Get how long the system has been running",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "system.shutdown": {
    id: "system.shutdown",
    name: "Shutdown System",
    description: "Shutdown the computer",
    riskLevel: "destructive",
    requiresConfirmation: true,
    parameterSchema: { delay: "number?" },
  },
  "system.restart": {
    id: "system.restart",
    name: "Restart System",
    description: "Restart the computer",
    riskLevel: "destructive",
    requiresConfirmation: true,
    parameterSchema: { delay: "number?" },
  },
  "system.sleep": {
    id: "system.sleep",
    name: "Sleep System",
    description: "Put the computer to sleep",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: {},
  },
};

// Application Capabilities
export const APP_CAPABILITIES: Record<string, Capability> = {
  "app.launch": {
    id: "app.launch",
    name: "Launch Application",
    description: "Launch an installed application",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { name: "string", args: "array?" },
  },
  "app.quit": {
    id: "app.quit",
    name: "Quit Application",
    description: "Quit a running application",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { name: "string" },
  },
  "app.list": {
    id: "app.list",
    name: "List Applications",
    description: "List all installed applications",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "app.list_running": {
    id: "app.list_running",
    name: "List Running Applications",
    description: "List currently running applications",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
};

// Window Management Capabilities (Mac)
export const WINDOW_CAPABILITIES: Record<string, Capability> = {
  "window.list": {
    id: "window.list",
    name: "List Windows",
    description: "List all open windows",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "window.focus": {
    id: "window.focus",
    name: "Focus Window",
    description: "Bring a window to front and focus it",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { windowId: "string" },
  },
  "window.minimize": {
    id: "window.minimize",
    name: "Minimize Window",
    description: "Minimize a window",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { windowId: "string" },
  },
  "window.maximize": {
    id: "window.maximize",
    name: "Maximize Window",
    description: "Maximize a window",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { windowId: "string" },
  },
  "window.close": {
    id: "window.close",
    name: "Close Window",
    description: "Close a window",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { windowId: "string" },
  },
  "window.resize": {
    id: "window.resize",
    name: "Resize Window",
    description: "Resize a window to specific dimensions",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { windowId: "string", width: "number", height: "number" },
  },
  "window.move": {
    id: "window.move",
    name: "Move Window",
    description: "Move a window to specific coordinates",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { windowId: "string", x: "number", y: "number" },
  },
};

// Network Capabilities
export const NETWORK_CAPABILITIES: Record<string, Capability> = {
  "network.ping": {
    id: "network.ping",
    name: "Ping Host",
    description: "Ping a network host to check connectivity",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { host: "string", count: "number?" },
  },
  "network.dns_lookup": {
    id: "network.dns_lookup",
    name: "DNS Lookup",
    description: "Resolve hostname to IP address",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { hostname: "string" },
  },
  "network.port_check": {
    id: "network.port_check",
    name: "Check Port",
    description: "Check if a port is open on a host",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { host: "string", port: "number" },
  },
  "network.download": {
    id: "network.download",
    name: "Download File",
    description: "Download a file from a URL",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { url: "string", destination: "string" },
  },
  "network.get_connections": {
    id: "network.get_connections",
    name: "Get Network Connections",
    description: "List active network connections",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
};

// Clipboard Capabilities
export const CLIPBOARD_CAPABILITIES: Record<string, Capability> = {
  "clipboard.read": {
    id: "clipboard.read",
    name: "Read Clipboard",
    description: "Read text from clipboard",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "clipboard.write": {
    id: "clipboard.write",
    name: "Write Clipboard",
    description: "Write text to clipboard",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { text: "string" },
  },
};

// Screenshot Capabilities
export const SCREENSHOT_CAPABILITIES: Record<string, Capability> = {
  "screenshot.capture": {
    id: "screenshot.capture",
    name: "Capture Screenshot",
    description: "Capture a screenshot of the entire screen",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string" },
  },
  "screenshot.capture_window": {
    id: "screenshot.capture_window",
    name: "Capture Window Screenshot",
    description: "Capture a screenshot of a specific window",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { windowId: "string", path: "string" },
  },
  "screenshot.capture_region": {
    id: "screenshot.capture_region",
    name: "Capture Region Screenshot",
    description: "Capture a screenshot of a specific region",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { x: "number", y: "number", width: "number", height: "number", path: "string" },
  },
};

// Text/Search Capabilities
export const TEXT_CAPABILITIES: Record<string, Capability> = {
  "text.search_in_file": {
    id: "text.search_in_file",
    name: "Search in File",
    description: "Search for text pattern in a file",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string", pattern: "string", regex: "boolean?" },
  },
  "text.replace_in_file": {
    id: "text.replace_in_file",
    name: "Replace in File",
    description: "Find and replace text in a file",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string", find: "string", replace: "string", regex: "boolean?" },
  },
  "text.count_lines": {
    id: "text.count_lines",
    name: "Count Lines",
    description: "Count lines in a file",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string" },
  },
};

// Archive Capabilities
export const ARCHIVE_CAPABILITIES: Record<string, Capability> = {
  "archive.compress": {
    id: "archive.compress",
    name: "Compress Files",
    description: "Create a compressed archive (zip, tar.gz)",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { sources: "array", destination: "string", format: "string?" },
  },
  "archive.extract": {
    id: "archive.extract",
    name: "Extract Archive",
    description: "Extract files from an archive",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { source: "string", destination: "string" },
  },
  "archive.list": {
    id: "archive.list",
    name: "List Archive Contents",
    description: "List contents of an archive without extracting",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string" },
  },
};

// Git Capabilities
export const GIT_CAPABILITIES: Record<string, Capability> = {
  "git.status": {
    id: "git.status",
    name: "Git Status",
    description: "Get git repository status",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string" },
  },
  "git.clone": {
    id: "git.clone",
    name: "Git Clone",
    description: "Clone a git repository",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { url: "string", destination: "string" },
  },
  "git.pull": {
    id: "git.pull",
    name: "Git Pull",
    description: "Pull latest changes from remote",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string" },
  },
  "git.commit": {
    id: "git.commit",
    name: "Git Commit",
    description: "Commit staged changes",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string", message: "string" },
  },
  "git.push": {
    id: "git.push",
    name: "Git Push",
    description: "Push commits to remote",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string" },
  },
  "git.branch_list": {
    id: "git.branch_list",
    name: "List Git Branches",
    description: "List all git branches",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { path: "string" },
  },
  "git.branch_create": {
    id: "git.branch_create",
    name: "Create Git Branch",
    description: "Create a new git branch",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string", name: "string" },
  },
  "git.checkout": {
    id: "git.checkout",
    name: "Git Checkout",
    description: "Checkout a branch or commit",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { path: "string", ref: "string" },
  },
};

// Docker Capabilities
export const DOCKER_CAPABILITIES: Record<string, Capability> = {
  "docker.list_containers": {
    id: "docker.list_containers",
    name: "List Docker Containers",
    description: "List all Docker containers",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { all: "boolean?" },
  },
  "docker.start_container": {
    id: "docker.start_container",
    name: "Start Docker Container",
    description: "Start a Docker container",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { containerId: "string" },
  },
  "docker.stop_container": {
    id: "docker.stop_container",
    name: "Stop Docker Container",
    description: "Stop a running Docker container",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { containerId: "string" },
  },
  "docker.remove_container": {
    id: "docker.remove_container",
    name: "Remove Docker Container",
    description: "Remove a Docker container",
    riskLevel: "destructive",
    requiresConfirmation: true,
    parameterSchema: { containerId: "string" },
  },
  "docker.list_images": {
    id: "docker.list_images",
    name: "List Docker Images",
    description: "List all Docker images",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "docker.pull_image": {
    id: "docker.pull_image",
    name: "Pull Docker Image",
    description: "Pull a Docker image from registry",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { image: "string" },
  },
};

// Database Capabilities
export const DATABASE_CAPABILITIES: Record<string, Capability> = {
  "db.query": {
    id: "db.query",
    name: "Database Query",
    description: "Execute a read-only database query",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { connection: "string", query: "string" },
  },
  "db.execute": {
    id: "db.execute",
    name: "Database Execute",
    description: "Execute a database command (INSERT, UPDATE, DELETE)",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { connection: "string", command: "string" },
  },
  "db.backup": {
    id: "db.backup",
    name: "Database Backup",
    description: "Create a database backup",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { connection: "string", destination: "string" },
  },
};

// Browser Capabilities
export const BROWSER_CAPABILITIES: Record<string, Capability> = {
  "browser.open_url": {
    id: "browser.open_url",
    name: "Open URL",
    description: "Open a URL in the default browser",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { url: "string" },
  },
  "browser.get_history": {
    id: "browser.get_history",
    name: "Get Browser History",
    description: "Get browser history (Chrome, Firefox, Safari)",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { browser: "string", limit: "number?" },
  },
  "browser.clear_cache": {
    id: "browser.clear_cache",
    name: "Clear Browser Cache",
    description: "Clear browser cache and cookies",
    riskLevel: "mutate",
    requiresConfirmation: true,
    parameterSchema: { browser: "string" },
  },
};

// Email Capabilities
export const EMAIL_CAPABILITIES: Record<string, Capability> = {
  "email.send": {
    id: "email.send",
    name: "Send Email",
    description: "Send an email via configured SMTP",
    riskLevel: "mutate",
    requiresConfirmation: true,
    parameterSchema: { to: "string", subject: "string", body: "string" },
  },
};

// Calendar Capabilities
export const CALENDAR_CAPABILITIES: Record<string, Capability> = {
  "calendar.create_event": {
    id: "calendar.create_event",
    name: "Create Calendar Event",
    description: "Create a new calendar event",
    riskLevel: "mutate",
    requiresConfirmation: false,
    parameterSchema: { title: "string", start: "string", end: "string", description: "string?" },
  },
  "calendar.list_events": {
    id: "calendar.list_events",
    name: "List Calendar Events",
    description: "List calendar events in a date range",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: { start: "string", end: "string" },
  },
};

// Combined registry
export const ALL_CAPABILITIES: Record<string, Capability> = {
  ...FILE_CAPABILITIES,
  ...PROCESS_CAPABILITIES,
  ...SYSTEM_CAPABILITIES,
  ...APP_CAPABILITIES,
  ...WINDOW_CAPABILITIES,
  ...NETWORK_CAPABILITIES,
  ...CLIPBOARD_CAPABILITIES,
  ...SCREENSHOT_CAPABILITIES,
  ...TEXT_CAPABILITIES,
  ...ARCHIVE_CAPABILITIES,
  ...GIT_CAPABILITIES,
  ...DOCKER_CAPABILITIES,
  ...DATABASE_CAPABILITIES,
  ...BROWSER_CAPABILITIES,
  ...EMAIL_CAPABILITIES,
  ...CALENDAR_CAPABILITIES,
};

export function findCapability(id: string): Capability | undefined {
  return ALL_CAPABILITIES[id];
}

export function getAllCapabilities(): Capability[] {
  return Object.values(ALL_CAPABILITIES);
}

export function getCapabilitiesByRisk(riskLevel: "read" | "mutate" | "destructive"): Capability[] {
  return Object.values(ALL_CAPABILITIES).filter((cap) => cap.riskLevel === riskLevel);
}
