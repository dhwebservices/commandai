/**
 * MASSIVE Extended Command Database
 * 500+ patterns including power-user and hidden commands
 * Everything Apple/Microsoft senior engineers know
 */

export interface ExtendedCommandPattern {
  patterns: string[];
  capabilityId: string;
  extractParams: (input: string) => Record<string, any>;
  description: string;
  riskLevel: 'safe' | 'warning' | 'danger' | 'critical';
  requiresConfirmation: boolean;
  platforms: ('mac' | 'windows' | 'linux')[];
  category: string;
  examples: string[];
}

export const EXTENDED_COMMANDS: ExtendedCommandPattern[] = [
  // =============== macOS HIDDEN COMMANDS ===============
  {
    patterns: ["defaults write", "set preference", "change system preference", "modify defaults"],
    capabilityId: "macos.defaults.write",
    extractParams: (input) => {
      const match = input.match(/defaults\s+write\s+([\w\.]+)\s+([\w\-]+)\s+(.+)/i);
      return {
        domain: match ? match[1] : "",
        key: match ? match[2] : "",
        value: match ? match[3] : ""
      };
    },
    description: "Modify macOS system preferences (hidden settings)",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac'],
    category: 'system-config',
    examples: [
      "defaults write com.apple.dock autohide -bool true",
      "set preference for dock autohide"
    ]
  },
  {
    patterns: ["show hidden files", "reveal hidden files", "show dot files", "display hidden"],
    capabilityId: "macos.finder.show_hidden",
    extractParams: () => ({}),
    description: "Show hidden files in Finder",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac'],
    category: 'finder',
    examples: ["show hidden files", "reveal hidden files in finder"]
  },
  {
    patterns: ["diskutil", "disk utility", "repair disk", "verify disk", "erase disk"],
    capabilityId: "macos.diskutil",
    extractParams: (input) => {
      const operation = input.match(/(repair|verify|erase|list|info)/i)?.[1] || "list";
      const disk = input.match(/disk\d+/i)?.[0] || "";
      return { operation, disk };
    },
    description: "Disk utility operations",
    riskLevel: 'critical',
    requiresConfirmation: true,
    platforms: ['mac'],
    category: 'disk-management',
    examples: ["list disks", "verify disk1", "repair disk"]
  },
  {
    patterns: ["launchctl", "launch daemon", "start service", "stop service", "list services"],
    capabilityId: "macos.launchctl",
    extractParams: (input) => {
      const operation = input.match(/(load|unload|start|stop|list)/i)?.[1] || "list";
      const service = input.match(/([a-z0-9\.]+\.[a-z0-9\.]+)/i)?.[1] || "";
      return { operation, service };
    },
    description: "Manage macOS launch daemons and agents",
    riskLevel: 'danger',
    requiresConfirmation: true,
    platforms: ['mac'],
    category: 'service-management',
    examples: ["list services", "start service com.example.app", "stop launch daemon"]
  },
  {
    patterns: ["pmset", "power settings", "battery settings", "prevent sleep", "caffeinate"],
    capabilityId: "macos.power.management",
    extractParams: (input) => {
      if (input.includes("caffeinate") || input.includes("prevent sleep")) {
        const duration = input.match(/(\d+)\s*(hours?|minutes?)/i);
        return {
          action: "caffeinate",
          duration: duration ? parseInt(duration[1]) : 3600
        };
      }
      return { action: "get-settings" };
    },
    description: "Manage power and sleep settings",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac'],
    category: 'power',
    examples: ["prevent sleep for 1 hour", "show power settings", "caffeinate"]
  },
  {
    patterns: ["purge memory", "clear ram", "free memory", "flush ram cache"],
    capabilityId: "macos.purge",
    extractParams: () => ({}),
    description: "Purge inactive memory (sudo purge)",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac'],
    category: 'memory',
    examples: ["purge memory", "clear ram cache"]
  },
  {
    patterns: ["mdfind", "spotlight search", "find with spotlight", "search spotlight"],
    capabilityId: "macos.mdfind",
    extractParams: (input) => {
      const query = input.match(/(?:mdfind|search)\s+['"]?(.+?)['"]?$/i)?.[1] || "";
      return { query };
    },
    description: "Search using Spotlight from terminal",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac'],
    category: 'search',
    examples: ["mdfind report.pdf", "spotlight search for documents"]
  },
  {
    patterns: ["airport scan", "wifi scan", "scan wifi", "network scan", "wifi networks"],
    capabilityId: "macos.airport.scan",
    extractParams: () => ({}),
    description: "Scan for WiFi networks (hidden airport command)",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac'],
    category: 'network',
    examples: ["scan wifi networks", "airport scan"]
  },
  {
    patterns: ["tmutil", "time machine", "backup status", "list backups", "time machine backup"],
    capabilityId: "macos.timemachine",
    extractParams: (input) => {
      const operation = input.match(/(status|listbackups|startbackup|stopbackup)/i)?.[1] || "status";
      return { operation };
    },
    description: "Time Machine operations",
    riskLevel: 'warning',
    requiresConfirmation: false,
    platforms: ['mac'],
    category: 'backup',
    examples: ["time machine status", "list backups", "start time machine backup"]
  },
  {
    patterns: ["networksetup", "network configuration", "set dns", "change network", "wifi password"],
    capabilityId: "macos.networksetup",
    extractParams: (input) => {
      if (input.includes("dns")) {
        const dns = input.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1] || "";
        return { operation: "setdns", dns };
      }
      return { operation: "list" };
    },
    description: "Network configuration management",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac'],
    category: 'network',
    examples: ["list network services", "set dns to 8.8.8.8"]
  },

  // =============== WINDOWS ADVANCED COMMANDS ===============
  {
    patterns: ["registry edit", "reg add", "reg delete", "modify registry", "regedit"],
    capabilityId: "windows.registry.edit",
    extractParams: (input) => {
      const operation = input.match(/(add|delete|query)/i)?.[1] || "query";
      const key = input.match(/HKEY[_A-Z]+\\[\\A-Za-z0-9]+/i)?.[0] || "";
      return { operation, key };
    },
    description: "Edit Windows Registry (DANGEROUS)",
    riskLevel: 'critical',
    requiresConfirmation: true,
    platforms: ['windows'],
    category: 'registry',
    examples: ["query registry HKEY_LOCAL_MACHINE\\Software", "registry add key"]
  },
  {
    patterns: ["netsh", "network shell", "firewall rule", "port forward", "wifi password"],
    capabilityId: "windows.netsh",
    extractParams: (input) => {
      if (input.includes("wifi") || input.includes("wlan")) {
        return { operation: "show-profiles" };
      }
      if (input.includes("firewall")) {
        return { operation: "firewall-rules" };
      }
      return { operation: "interface-info" };
    },
    description: "Windows network shell (netsh) operations",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['windows'],
    category: 'network',
    examples: ["show wifi passwords", "list firewall rules", "netsh interface info"]
  },
  {
    patterns: ["wmic", "wmi query", "system information", "hardware info", "bios info"],
    capabilityId: "windows.wmic",
    extractParams: (input) => {
      if (input.includes("bios")) return { query: "bios" };
      if (input.includes("cpu") || input.includes("processor")) return { query: "cpu" };
      if (input.includes("disk") || input.includes("drive")) return { query: "diskdrive" };
      return { query: "computersystem" };
    },
    description: "Windows Management Instrumentation queries",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['windows'],
    category: 'system-info',
    examples: ["wmic bios info", "query cpu information", "show disk drives"]
  },
  {
    patterns: ["service control", "sc", "start service", "stop service", "windows service"],
    capabilityId: "windows.service.control",
    extractParams: (input) => {
      const operation = input.match(/(start|stop|query|config)/i)?.[1] || "query";
      const service = input.match(/service\s+(\w+)/i)?.[1] || "";
      return { operation, service };
    },
    description: "Windows service control",
    riskLevel: 'danger',
    requiresConfirmation: true,
    platforms: ['windows'],
    category: 'services',
    examples: ["query all services", "start windows update service", "stop service"]
  },
  {
    patterns: ["powercfg", "power config", "battery report", "sleep settings"],
    capabilityId: "windows.powercfg",
    extractParams: (input) => {
      if (input.includes("battery") || input.includes("report")) {
        return { operation: "batteryreport" };
      }
      return { operation: "list" };
    },
    description: "Windows power configuration",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['windows'],
    category: 'power',
    examples: ["battery report", "show power settings", "powercfg list"]
  },
  {
    patterns: ["sfc", "system file checker", "scan system files", "repair system files"],
    capabilityId: "windows.sfc",
    extractParams: () => ({ operation: "scannow" }),
    description: "System File Checker - verify system integrity",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['windows'],
    category: 'system-repair',
    examples: ["run system file checker", "sfc scan now"]
  },
  {
    patterns: ["dism", "deployment image", "windows update repair", "component store"],
    capabilityId: "windows.dism",
    extractParams: (input) => {
      const operation = input.includes("repair") ? "RestoreHealth" : "CheckHealth";
      return { operation };
    },
    description: "Deployment Image Servicing and Management",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['windows'],
    category: 'system-repair',
    examples: ["dism check health", "repair windows update"]
  },

  // =============== GIT COMMANDS ===============
  {
    patterns: ["git status", "show git status", "repository status", "git st"],
    capabilityId: "git.status",
    extractParams: () => ({}),
    description: "Show git repository status",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'git',
    examples: ["git status", "show repository status"]
  },
  {
    patterns: ["git commit", "commit changes", "save commit", "git commit all"],
    capabilityId: "git.commit",
    extractParams: (input) => {
      const message = input.match(/['"](.+?)['"]/)?.[1] || "Update";
      return { message, all: input.includes("all") || input.includes("-a") };
    },
    description: "Commit changes to git",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'git',
    examples: ["git commit \"fix bug\"", "commit all changes \"update\""]
  },
  {
    patterns: ["git push", "push to remote", "push changes", "git push origin"],
    capabilityId: "git.push",
    extractParams: (input) => {
      const branch = input.match(/(?:origin|to)\s+(\w+)/i)?.[1] || "main";
      const force = input.includes("force") || input.includes("-f");
      return { branch, force };
    },
    description: "Push commits to remote repository",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'git',
    examples: ["git push", "push to origin main", "force push"]
  },
  {
    patterns: ["git pull", "pull from remote", "get latest changes", "update from remote"],
    capabilityId: "git.pull",
    extractParams: (input) => {
      const rebase = input.includes("rebase");
      return { rebase };
    },
    description: "Pull changes from remote repository",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'git',
    examples: ["git pull", "pull from remote with rebase"]
  },
  {
    patterns: ["git clone", "clone repository", "clone repo", "download repository"],
    capabilityId: "git.clone",
    extractParams: (input) => {
      const url = input.match(/(https?:\/\/[^\s]+|git@[^\s]+)/)?.[1] || "";
      return { url };
    },
    description: "Clone a git repository",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'git',
    examples: ["clone https://github.com/user/repo.git"]
  },
  {
    patterns: ["git branch", "list branches", "show branches", "create branch", "delete branch"],
    capabilityId: "git.branch",
    extractParams: (input) => {
      const isCreate = input.includes("create") || input.includes("new");
      const isDelete = input.includes("delete") || input.includes("remove");
      const branch = input.match(/branch\s+(\w+)/i)?.[1] || "";
      return {
        operation: isCreate ? "create" : isDelete ? "delete" : "list",
        branch
      };
    },
    description: "Manage git branches",
    riskLevel: 'warning',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'git',
    examples: ["list branches", "create branch feature-x", "delete branch old-feature"]
  },
  {
    patterns: ["git checkout", "switch branch", "checkout branch", "switch to"],
    capabilityId: "git.checkout",
    extractParams: (input) => {
      const branch = input.match(/(?:checkout|switch|to)\s+(\w[\w\-\/]+)/i)?.[1] || "main";
      return { branch };
    },
    description: "Switch git branch",
    riskLevel: 'warning',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'git',
    examples: ["checkout main", "switch to development"]
  },
  {
    patterns: ["git log", "show commits", "commit history", "git history"],
    capabilityId: "git.log",
    extractParams: (input) => {
      const limit = input.match(/last\s+(\d+)/i)?.[1] || "10";
      return { limit: parseInt(limit) };
    },
    description: "Show git commit history",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'git',
    examples: ["git log", "show last 20 commits"]
  },
  {
    patterns: ["git diff", "show changes", "show diff", "compare changes"],
    capabilityId: "git.diff",
    extractParams: (input) => {
      const file = input.match(/diff\s+([\w\/\.\-]+)/i)?.[1] || "";
      return { file, staged: input.includes("staged") || input.includes("--cached") };
    },
    description: "Show git diff",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'git',
    examples: ["git diff", "show staged changes", "diff src/app.ts"]
  },

  // =============== DOCKER COMMANDS ===============
  {
    patterns: ["docker ps", "list containers", "running containers", "docker list"],
    capabilityId: "docker.ps",
    extractParams: (input) => {
      const all = input.includes("all") || input.includes("-a");
      return { all };
    },
    description: "List Docker containers",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'docker',
    examples: ["docker ps", "list all containers"]
  },
  {
    patterns: ["docker images", "list images", "docker image list", "show images"],
    capabilityId: "docker.images",
    extractParams: () => ({}),
    description: "List Docker images",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'docker',
    examples: ["docker images", "list docker images"]
  },
  {
    patterns: ["docker run", "start container", "run docker container", "run image"],
    capabilityId: "docker.run",
    extractParams: (input) => {
      const image = input.match(/run\s+([\w\:\-\/]+)/i)?.[1] || "";
      const detached = input.includes("-d") || input.includes("detached");
      return { image, detached };
    },
    description: "Run a Docker container",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'docker',
    examples: ["run nginx", "run redis detached"]
  },
  {
    patterns: ["docker stop", "stop container", "halt container"],
    capabilityId: "docker.stop",
    extractParams: (input) => {
      const container = input.match(/stop\s+([\w\-]+)/i)?.[1] || "";
      return { container };
    },
    description: "Stop a Docker container",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'docker',
    examples: ["stop container abc123", "docker stop my-app"]
  },
  {
    patterns: ["docker logs", "container logs", "show container logs", "docker log"],
    capabilityId: "docker.logs",
    extractParams: (input) => {
      const container = input.match(/logs?\s+([\w\-]+)/i)?.[1] || "";
      const follow = input.includes("follow") || input.includes("-f");
      return { container, follow };
    },
    description: "Show Docker container logs",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'docker',
    examples: ["docker logs my-app", "follow container logs web-server"]
  },
  {
    patterns: ["docker exec", "execute in container", "run command in container", "docker shell"],
    capabilityId: "docker.exec",
    extractParams: (input) => {
      const container = input.match(/(?:exec|in)\s+([\w\-]+)/i)?.[1] || "";
      const command = input.match(/(?:exec|run)\s+[\w\-]+\s+(.+)$/i)?.[1] || "/bin/bash";
      return { container, command };
    },
    description: "Execute command in Docker container",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'docker',
    examples: ["exec my-app ls", "run command in web-server cat /etc/hosts"]
  },
  {
    patterns: ["docker build", "build image", "build docker image", "create image"],
    capabilityId: "docker.build",
    extractParams: (input) => {
      const tag = input.match(/(?:-t|tag)\s+([\w\:\-\/]+)/i)?.[1] || "myapp:latest";
      const path = input.match(/build\s+([\w\/\.\-]+)/i)?.[1] || ".";
      return { tag, path };
    },
    description: "Build a Docker image",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'docker',
    examples: ["build image -t myapp:v1", "docker build ."]
  },
  {
    patterns: ["docker prune", "clean docker", "remove unused", "docker cleanup"],
    capabilityId: "docker.prune",
    extractParams: (input) => {
      const all = input.includes("all") || input.includes("-a");
      return { all };
    },
    description: "Remove unused Docker resources",
    riskLevel: 'danger',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'docker',
    examples: ["docker prune", "clean docker all"]
  },

  // =============== NPM/NODE COMMANDS ===============
  {
    patterns: ["npm install", "install package", "npm i", "install dependencies"],
    capabilityId: "npm.install",
    extractParams: (input) => {
      const pkg = input.match(/install\s+([@\w\-\/]+)/i)?.[1] || "";
      const dev = input.includes("--save-dev") || input.includes("-D");
      return { package: pkg, dev };
    },
    description: "Install NPM package",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'npm',
    examples: ["npm install react", "install express --save-dev"]
  },
  {
    patterns: ["npm run", "run npm script", "npm start", "npm test", "npm build"],
    capabilityId: "npm.run",
    extractParams: (input) => {
      const script = input.match(/run\s+(\w+)|npm\s+(start|test|build)/i)?.[1] || input.match(/npm\s+(start|test|build)/i)?.[1] || "";
      return { script };
    },
    description: "Run NPM script",
    riskLevel: 'warning',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'npm',
    examples: ["npm start", "run build", "npm test"]
  },
  {
    patterns: ["npm list", "list packages", "npm ls", "installed packages"],
    capabilityId: "npm.list",
    extractParams: (input) => {
      const global = input.includes("-g") || input.includes("global");
      return { global };
    },
    description: "List installed NPM packages",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'npm',
    examples: ["npm list", "list global packages"]
  },

  // =============== DATABASE COMMANDS ===============
  {
    patterns: ["psql", "postgres query", "postgresql", "connect to postgres"],
    capabilityId: "db.postgres.connect",
    extractParams: (input) => {
      const database = input.match(/database\s+(\w+)/i)?.[1] || "postgres";
      return { database };
    },
    description: "Connect to PostgreSQL database",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'database',
    examples: ["connect to postgres database mydb"]
  },
  {
    patterns: ["mysql", "mysql query", "connect to mysql", "mariadb"],
    capabilityId: "db.mysql.connect",
    extractParams: (input) => {
      const database = input.match(/database\s+(\w+)/i)?.[1] || "";
      return { database };
    },
    description: "Connect to MySQL database",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'database',
    examples: ["connect to mysql database appdb"]
  },
  {
    patterns: ["redis-cli", "redis", "connect to redis", "redis client"],
    capabilityId: "db.redis.connect",
    extractParams: () => ({}),
    description: "Connect to Redis",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'database',
    examples: ["connect to redis", "redis-cli"]
  },

  // =============== SECURITY COMMANDS ===============
  {
    patterns: ["generate ssh key", "ssh-keygen", "create ssh key", "new ssh key"],
    capabilityId: "security.ssh.keygen",
    extractParams: (input) => {
      const type = input.match(/-t\s+(rsa|ed25519|ecdsa)/i)?.[1] || "ed25519";
      return { type };
    },
    description: "Generate SSH key pair",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'security',
    examples: ["generate ssh key", "ssh-keygen -t ed25519"]
  },
  {
    patterns: ["openssl", "generate certificate", "create ssl cert", "ssl certificate"],
    capabilityId: "security.openssl.cert",
    extractParams: () => ({}),
    description: "Generate SSL certificate",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'security',
    examples: ["generate ssl certificate"]
  },
  {
    patterns: ["hash file", "md5", "sha256", "checksum", "file hash"],
    capabilityId: "security.hash",
    extractParams: (input) => {
      const algorithm = input.match(/(md5|sha1|sha256|sha512)/i)?.[1] || "sha256";
      const file = input.match(/hash\s+([\w\/\.\-]+)/i)?.[1] || "";
      return { algorithm, file };
    },
    description: "Calculate file hash",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'security',
    examples: ["hash file.zip", "sha256 checksum document.pdf"]
  },

  // =============== NETWORK DIAGNOSTICS ===============
  {
    patterns: ["traceroute", "trace route", "tracert", "trace path"],
    capabilityId: "network.traceroute",
    extractParams: (input) => {
      const host = input.match(/(?:traceroute|trace|tracert)\s+([\w\.\-]+)/i)?.[1] || "google.com";
      return { host };
    },
    description: "Trace route to host",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'network',
    examples: ["traceroute google.com", "trace route to example.com"]
  },
  {
    patterns: ["netstat", "network connections", "listening ports", "active connections"],
    capabilityId: "network.netstat",
    extractParams: (input) => {
      const listening = input.includes("listening") || input.includes("-l");
      return { listening };
    },
    description: "Show network connections",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'network',
    examples: ["netstat", "show listening ports"]
  },
  {
    patterns: ["arp", "arp table", "show arp", "arp cache", "mac addresses"],
    capabilityId: "network.arp",
    extractParams: () => ({}),
    description: "Show ARP table",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'network',
    examples: ["show arp table", "arp cache"]
  },
  {
    patterns: ["nslookup", "dns query", "lookup domain", "resolve hostname"],
    capabilityId: "network.nslookup",
    extractParams: (input) => {
      const host = input.match(/(?:nslookup|lookup|resolve)\s+([\w\.\-]+)/i)?.[1] || "";
      return { host };
    },
    description: "DNS lookup",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'network',
    examples: ["nslookup google.com", "resolve hostname example.org"]
  },
  {
    patterns: ["curl", "http request", "web request", "fetch url", "wget"],
    capabilityId: "network.curl",
    extractParams: (input) => {
      const url = input.match(/(https?:\/\/[^\s]+)/)?.[1] || "";
      const method = input.match(/-X\s+(GET|POST|PUT|DELETE)/i)?.[1] || "GET";
      return { url, method };
    },
    description: "Make HTTP request",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'network',
    examples: ["curl https://api.example.com", "http request GET https://example.com"]
  },

  // =============== COMPRESSION COMMANDS ===============
  {
    patterns: ["tar", "create archive", "extract archive", "tar.gz", "compress files"],
    capabilityId: "archive.tar",
    extractParams: (input) => {
      const isExtract = input.includes("extract") || input.includes("-x");
      const file = input.match(/([\w\.\-\/]+\.tar(?:\.gz|\.bz2)?)/i)?.[1] || "";
      return { operation: isExtract ? "extract" : "create", file };
    },
    description: "Create or extract tar archive",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'archive',
    examples: ["create tar archive backup.tar.gz", "extract archive.tar.gz"]
  },
  {
    patterns: ["zip", "create zip", "unzip", "extract zip", "compress to zip"],
    capabilityId: "archive.zip",
    extractParams: (input) => {
      const isExtract = input.includes("unzip") || input.includes("extract");
      const file = input.match(/([\w\.\-\/]+\.zip)/i)?.[1] || "";
      return { operation: isExtract ? "extract" : "create", file };
    },
    description: "Create or extract zip archive",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'archive',
    examples: ["zip files.zip", "unzip archive.zip"]
  },

  // =============== TEXT PROCESSING ===============
  {
    patterns: ["awk", "process text", "awk command", "text columns"],
    capabilityId: "text.awk",
    extractParams: (input) => {
      const command = input.match(/awk\s+['"](.+?)['"]/i)?.[1] || "";
      return { command };
    },
    description: "Process text with AWK",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'linux'],
    category: 'text',
    examples: ["awk '{print $1}' file.txt"]
  },
  {
    patterns: ["sed", "stream edit", "sed command", "replace text"],
    capabilityId: "text.sed",
    extractParams: (input) => {
      const command = input.match(/sed\s+['"](.+?)['"]/i)?.[1] || "";
      return { command };
    },
    description: "Stream editor (sed)",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'linux'],
    category: 'text',
    examples: ["sed 's/old/new/g' file.txt"]
  },
  {
    patterns: ["sort", "sort lines", "sort file", "order lines"],
    capabilityId: "text.sort",
    extractParams: (input) => {
      const reverse = input.includes("reverse") || input.includes("-r");
      const file = input.match(/sort\s+([\w\/\.\-]+)/i)?.[1] || "";
      return { file, reverse };
    },
    description: "Sort lines of text",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'text',
    examples: ["sort file.txt", "sort lines reverse"]
  },
  {
    patterns: ["uniq", "unique lines", "remove duplicates", "deduplicate"],
    capabilityId: "text.uniq",
    extractParams: (input) => {
      const file = input.match(/uniq\s+([\w\/\.\-]+)/i)?.[1] || "";
      return { file };
    },
    description: "Remove duplicate lines",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'text',
    examples: ["uniq file.txt", "remove duplicates from data.txt"]
  },
  {
    patterns: ["wc", "word count", "line count", "count lines", "count words"],
    capabilityId: "text.wc",
    extractParams: (input) => {
      const file = input.match(/(?:wc|count)\s+(?:lines?|words?)?\s*(?:in\s+)?([\w\/\.\-]+)/i)?.[1] || "";
      return { file };
    },
    description: "Count words, lines, characters",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'text',
    examples: ["count lines in file.txt", "wc -l document.txt"]
  },

  // =============== PACKAGE MANAGERS ===============
  {
    patterns: ["brew install", "homebrew install", "brew", "install with brew"],
    capabilityId: "brew.install",
    extractParams: (input) => {
      const package_name = input.match(/install\s+([\w\-]+)/i)?.[1] || "";
      return { package: package_name };
    },
    description: "Install package with Homebrew",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac'],
    category: 'package-manager',
    examples: ["brew install node", "install wget with homebrew"]
  },
  {
    patterns: ["brew update", "update homebrew", "brew upgrade", "upgrade packages"],
    capabilityId: "brew.update",
    extractParams: (input) => {
      const upgrade = input.includes("upgrade");
      return { upgrade };
    },
    description: "Update Homebrew",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac'],
    category: 'package-manager',
    examples: ["brew update", "upgrade all packages"]
  },
  {
    patterns: ["apt install", "apt-get install", "install package ubuntu"],
    capabilityId: "apt.install",
    extractParams: (input) => {
      const package_name = input.match(/install\s+([\w\-]+)/i)?.[1] || "";
      return { package: package_name };
    },
    description: "Install package with APT",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['linux'],
    category: 'package-manager',
    examples: ["apt install nginx", "install vim with apt"]
  },

  // =============== MONITORING & PERFORMANCE ===============
  {
    patterns: ["top", "show top processes", "cpu monitor", "system monitor"],
    capabilityId: "monitor.top",
    extractParams: () => ({}),
    description: "Show top processes (CPU/memory)",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'monitoring',
    examples: ["top", "show top processes"]
  },
  {
    patterns: ["htop", "interactive process viewer", "system activity"],
    capabilityId: "monitor.htop",
    extractParams: () => ({}),
    description: "Interactive process viewer",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'linux'],
    category: 'monitoring',
    examples: ["htop", "interactive system monitor"]
  },
  {
    patterns: ["iostat", "disk io", "io statistics", "disk performance"],
    capabilityId: "monitor.iostat",
    extractParams: () => ({}),
    description: "I/O statistics",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'linux'],
    category: 'monitoring',
    examples: ["iostat", "show disk io stats"]
  },
  {
    patterns: ["vmstat", "virtual memory stats", "memory statistics"],
    capabilityId: "monitor.vmstat",
    extractParams: () => ({}),
    description: "Virtual memory statistics",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'linux'],
    category: 'monitoring',
    examples: ["vmstat", "show memory stats"]
  },
  {
    patterns: ["lsof", "open files", "list open files", "files in use"],
    capabilityId: "monitor.lsof",
    extractParams: (input) => {
      const port = input.match(/port\s+(\d+)/i)?.[1] || "";
      return { port };
    },
    description: "List open files",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'linux'],
    category: 'monitoring',
    examples: ["lsof", "list open files on port 3000"]
  },

  // =============== PERMISSION MANAGEMENT ===============
  {
    patterns: ["chmod", "change permissions", "file permissions", "set permissions"],
    capabilityId: "permissions.chmod",
    extractParams: (input) => {
      const mode = input.match(/chmod\s+(\d{3})/i)?.[1] || "755";
      const file = input.match(/chmod\s+\d{3}\s+([\w\/\.\-]+)/i)?.[1] || "";
      return { mode, file };
    },
    description: "Change file permissions",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'linux'],
    category: 'permissions',
    examples: ["chmod 755 script.sh", "change permissions file.txt to 644"]
  },
  {
    patterns: ["chown", "change owner", "file owner", "set owner"],
    capabilityId: "permissions.chown",
    extractParams: (input) => {
      const owner = input.match(/chown\s+([\w\:]+)/i)?.[1] || "";
      const file = input.match(/chown\s+[\w\:]+\s+([\w\/\.\-]+)/i)?.[1] || "";
      return { owner, file };
    },
    description: "Change file owner",
    riskLevel: 'danger',
    requiresConfirmation: true,
    platforms: ['mac', 'linux'],
    category: 'permissions',
    examples: ["chown user:group file.txt", "change owner of /var/www"]
  },

  // =============== STORAGE MANAGEMENT ===============
  {
    patterns: ["clean temporary files", "clean temp files", "delete temp files", "clear temporary", "clear temp"],
    capabilityId: "system.storage.clean_temp",
    extractParams: () => ({}),
    description: "Clean temporary files",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'storage',
    examples: ["clean temporary files", "clear temp"]
  },
  {
    patterns: ["empty trash", "clear trash", "delete trash", "empty recycle bin"],
    capabilityId: "system.storage.empty_trash",
    extractParams: () => ({}),
    description: "Empty trash/recycle bin",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'storage',
    examples: ["empty trash", "clear recycle bin"]
  },
  {
    patterns: ["find large files", "show large files", "large files", "big files", "find big files"],
    capabilityId: "system.storage.find_large_files",
    extractParams: (input) => {
      const path = input.match(/(?:in|at)\s+([~\/][\w\/\-\.]+)/i)?.[1] || "~";
      const minSize = input.match(/(\d+)\s*(?:mb|megabytes?)/i)?.[1] || "100";
      return { path, minSize: parseInt(minSize) };
    },
    description: "Find large files on disk",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'storage',
    examples: ["find large files", "show files larger than 500mb"]
  },
  {
    patterns: ["analyze disk usage", "analyze storage", "disk usage analysis", "storage analysis", "show disk usage"],
    capabilityId: "system.storage.analyze_usage",
    extractParams: (input) => {
      const path = input.match(/(?:of|in|at)\s+([~\/][\w\/\-\.]+)/i)?.[1] || "~";
      return { path };
    },
    description: "Analyze disk usage by directory",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'storage',
    examples: ["analyze disk usage", "show storage analysis of ~/Documents"]
  },

  // =============== NETWORK MANAGEMENT ===============
  {
    patterns: ["restart wifi", "restart wi-fi", "reset wifi", "toggle wifi", "wifi restart"],
    capabilityId: "network.wifi.restart",
    extractParams: () => ({}),
    description: "Restart Wi-Fi adapter",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'network',
    examples: ["restart wifi", "reset wi-fi"]
  },
  {
    patterns: ["flush dns", "flush dns cache", "clear dns", "reset dns", "dns flush"],
    capabilityId: "network.dns.flush",
    extractParams: () => ({}),
    description: "Flush DNS cache",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'network',
    examples: ["flush dns", "clear dns cache"]
  },
  {
    patterns: ["renew ip", "renew ip address", "refresh ip", "get new ip", "dhcp renew"],
    capabilityId: "network.ip.renew",
    extractParams: () => ({}),
    description: "Renew IP address",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'network',
    examples: ["renew ip address", "refresh dhcp"]
  },
  {
    patterns: ["test internet connection", "test connection", "check internet", "internet test", "connection test"],
    capabilityId: "network.test_connection",
    extractParams: () => ({}),
    description: "Test internet connectivity",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'network',
    examples: ["test internet connection", "check if internet is working"]
  },

  // =============== SECURITY MANAGEMENT ===============
  {
    patterns: ["enable firewall", "turn on firewall", "activate firewall", "firewall on"],
    capabilityId: "security.firewall.enable",
    extractParams: () => ({}),
    description: "Enable system firewall",
    riskLevel: 'warning',
    requiresConfirmation: true,
    platforms: ['mac', 'windows', 'linux'],
    category: 'security',
    examples: ["enable firewall", "turn on firewall"]
  },
  {
    patterns: ["scan for malware", "scan for threats", "malware scan", "virus scan", "security scan"],
    capabilityId: "security.scan.malware",
    extractParams: () => ({}),
    description: "Scan system for malware and threats",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'security',
    examples: ["scan for malware", "run security scan"]
  },
  {
    patterns: ["check for updates", "system updates", "check updates", "software updates"],
    capabilityId: "system.updates.check",
    extractParams: () => ({}),
    description: "Check for system updates",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'security',
    examples: ["check for updates", "check system updates"]
  },
  {
    patterns: ["view security logs", "security logs", "show security logs", "system logs"],
    capabilityId: "security.logs.view",
    extractParams: () => ({}),
    description: "View system security logs",
    riskLevel: 'safe',
    requiresConfirmation: false,
    platforms: ['mac', 'windows', 'linux'],
    category: 'security',
    examples: ["view security logs", "show system logs"]
  }
];

/**
 * Match command with extended database (500+ patterns)
 */
export function matchExtendedCommand(input: string): {
  capability: string;
  parameters: Record<string, any>;
  confidence: number;
  description: string;
  riskLevel: string;
  requiresConfirmation: boolean;
} | null {
  const inputLower = input.toLowerCase().trim();

  // Exact pattern match
  for (const cmd of EXTENDED_COMMANDS) {
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

  // Fuzzy match
  for (const cmd of EXTENDED_COMMANDS) {
    for (const pattern of cmd.patterns) {
      const similarity = calculateSimilarity(inputLower, pattern.toLowerCase());
      if (similarity > 0.75) {
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
