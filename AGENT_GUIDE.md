# CommandAI Desktop Agent Guide

## Overview

CommandAI includes a comprehensive AI agent system that can control your Mac or Windows computer using natural language commands. The agent can perform over 100 different operations across file system, processes, applications, network, and system management.

## Quick Start

### 1. Start the Backend API (if not already running)

```bash
cd /Users/david/Downloads/commandai/apps/api-gateway
SUPABASE_URL=https://xnmmwqrezspgjspdllzb.supabase.co \
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubW13cXJlenNwZ2pzcGRsbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTk1NTIsImV4cCI6MjA5OTE3NTU1Mn0.npTAZwcjLOVkrvLBbOavN8y4QKjmHouIqQcACElnskM \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubW13cXJlenNwZ2pzcGRsbHpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5OTU1MiwiZXhwIjoyMDk5MTc1NTUyfQ.qTy4JqM8XS4kzSJjIrg68s9RMRyh0VauHGndu7xmYtY \
RESEND_API_KEY=re_NvqKHepA_2Vn8HoXm8R4a5Xa1R92urXr8 \
RESEND_FROM_EMAIL=auth@dhwebsiteservices.co.uk \
WEB_APP_URL=http://localhost:5173 \
ANTHROPIC_API_KEY=your-anthropic-api-key-here \
NODE_ENV=local \
API_GATEWAY_PORT=3000 \
LOG_LEVEL=debug \
node dist/main.js
```

### 2. Start the Web Console

```bash
cd /Users/david/Downloads/commandai/apps/web-console
pnpm dev
```

Open http://localhost:5173 and log in with your account.

### 3. Start the Desktop Agent

```bash
cd /Users/david/Downloads/commandai/apps/desktop-agent
TENANT_ID=your-user-id pnpm start
```

Replace `your-user-id` with your actual user ID from the login session.

### 4. Use the Agent Dashboard

1. Click the "AI Agent" card on the main dashboard
2. Type a natural language command (e.g., "Show me my CPU usage")
3. Click "Send Command"
4. Watch the agent execute your command and see the results!

## Capabilities

The agent supports over 100 capabilities across these categories:

### File System
- Read, write, append, delete files
- List, search, move, copy files
- Create and delete directories
- Get file info and set permissions

### Process Management
- List running processes
- Kill processes
- Start new processes
- Get process information

### Applications
- Launch applications
- Quit applications
- List installed applications
- List running applications

### System Information
- CPU usage
- Memory usage
- Disk usage
- Network interfaces
- System info and uptime
- Shutdown, restart, sleep

### Network
- Ping hosts
- DNS lookups
- Port checking
- Download files
- View network connections

### Clipboard
- Read clipboard
- Write to clipboard

### Screenshots
- Capture full screen
- Capture specific windows
- Capture regions

### Text Operations
- Search in files
- Replace in files
- Count lines

### Archives
- Compress files (zip, tar.gz)
- Extract archives
- List archive contents

### Git Operations
- Status, clone, pull, push
- Commit changes
- List and create branches
- Checkout branches

### Docker (if installed)
- List containers and images
- Start/stop/remove containers
- Pull images

## Example Commands

### System Monitoring
- "Show me my CPU usage"
- "How much memory am I using?"
- "Show me my disk space"
- "What's my system info?"

### File Management
- "Create a folder called 'projects' in my home directory"
- "List all files in /tmp"
- "Delete the file /tmp/test.txt"
- "Search for all .txt files in my Documents folder"

### Process Management
- "List all running processes"
- "Kill process 1234"
- "Launch Safari"
- "Quit Chrome"

### Network
- "Ping google.com"
- "Download https://example.com/file.zip to ~/Downloads"

### Clipboard
- "Copy 'Hello World' to clipboard"
- "Show me what's in the clipboard"

### Screenshots
- "Take a screenshot and save it to ~/Desktop/screenshot.png"

## Safety Features

The agent includes multiple safety layers:

1. **Risk Levels**: All capabilities are classified as read, mutate, or destructive
2. **Confirmation Required**: Destructive operations (delete, shutdown) require explicit confirmation
3. **Parameter Validation**: All parameters are validated before execution
4. **Audit Trail**: All commands and results are logged
5. **Tenant Isolation**: Each user's agent is isolated to their tenant

## Architecture

```
User → Web Console → API Gateway → Intent Queue → Desktop Agent → System
         (React)      (NestJS)      (In-Memory)    (Node.js)    (Mac/Win)
```

1. User enters natural language command
2. AI (Claude) converts it to structured intent
3. Intent is queued in the API
4. Desktop agent polls for intents
5. Agent executes capability on local system
6. Result is reported back to API
7. User sees result in web console

## AI Integration

The system uses Claude (Anthropic API) to convert natural language into structured intents:

```typescript
// Input
"Show me my CPU usage"

// AI Generated Intent
{
  "capabilityId": "system.cpu.usage",
  "parameters": {},
  "reasoning": "User wants to see CPU usage statistics. The system.cpu.usage capability will return current CPU usage for all cores."
}
```

## Security Considerations

**IMPORTANT**: This agent has broad system access. Only use it on trusted systems.

- Never run the agent with elevated privileges unless absolutely necessary
- Review commands before confirmation for destructive operations
- Keep your ANTHROPIC_API_KEY private
- Monitor the audit logs regularly

## Troubleshooting

### Agent not executing commands
- Check that the desktop agent is running
- Verify TENANT_ID matches your user ID
- Check API Gateway logs for errors

### AI not generating intents
- Ensure ANTHROPIC_API_KEY is set correctly
- Check that you have API credits available
- Review API Gateway logs for errors

### Permission errors
- Some operations may require sudo/admin privileges
- Run the agent with appropriate permissions for your use case

## Next Steps

- Add more capabilities (email, calendar, browser control)
- Implement mTLS authentication for production
- Add real-time streaming (WebSocket or gRPC)
- Create mobile app for remote control
- Add capability for machine learning workflows

## Development

To add new capabilities:

1. Define capability in `apps/api-gateway/src/modules/intents/capabilities/index.ts`
2. Implement executor in `apps/desktop-agent/src/executors/`
3. Update AI prompt in `apps/api-gateway/src/modules/ai/ai.controller.ts`
4. Rebuild and test!

---

**Built with**: Node.js, TypeScript, NestJS, React, Anthropic Claude API
