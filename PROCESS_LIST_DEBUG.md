# Process List Debugging

## Issue
"List all running processes" quick action returns empty `{}` instead of process list.

## Investigation Steps

### 1. Code Flow Analysis
✅ **Confirmed the execution path:**
1. User clicks quick action or types "list processes"
2. `runCommand()` in app.js → `ipcRenderer.invoke('send-command', cmd)`
3. `main.ts` handles 'send-command' → `executeQuickCommand()`
4. Creates intent via POST to `/v1/intents`
5. `checkForIntents()` polls `/v1/intents/pending`
6. `executeIntent()` → `agent.executeIntent()`
7. `agent.executeCapability()` → `processExecutor.execute('process.list')`
8. Result POSTed to `/v1/intents/${id}/result`
9. `loadActivities()` fetches `/v1/intents/${id}/result`
10. Result displayed in activity view

### 2. Process Executor Code
✅ **Verified process.list implementation:**
```typescript
private async listProcesses(): Promise<any[]> {
  if (this.platform === "win32") {
    const { stdout } = await execAsync(
      'powershell "Get-Process | Select-Object Id,ProcessName,CPU,WorkingSet | ConvertTo-Json"',
    );
    return JSON.parse(stdout);
  } else {
    const { stdout } = await execAsync("ps aux");
    return this.parseUnixPs(stdout);
  }
}
```

**Should return:** Array of process objects like:
```javascript
[
  { user: "root", pid: "1", "%cpu": "0.0", "%mem": "0.1", command: "/sbin/init", ... },
  { user: "david", pid: "1234", "%cpu": "2.5", "%mem": "1.2", command: "node", ... },
  ...
]
```

### 3. Added Enhanced Logging

**desktop-app/src/agent.ts:**
- Logs result type, array status, length, preview
- Shows what's being returned before posting to API

**desktop-app/src/main.ts:**
- Logs what's received from agent
- Logs what's being posted to API
- Logs API response status

**api-gateway/src/modules/intents/intents-simple.controller.ts:**
- Logs what API receives in POST /intents/:id/result
- Logs result type, array status, storage confirmation

### 4. Next Steps

**After rebuild completes:**
1. Start API: `cd apps/api-gateway && pnpm run dev`
2. Install new DMG (when desktop-app build completes)
3. Login to desktop app
4. Run "list processes" command
5. Check logs in both API and app Developer Tools Console

**Expected log output:**
```
[Agent] Executing intent <id>: process.list
[Agent] Result type: object
[Agent] Result is array: true
[Agent] Result length: 150
[Agent] Result preview: [{"user":"root","pid":"1"...
[executeIntent] Result.result type: object
[executeIntent] Result.result preview: [{"user":"root"...
[executeIntent] Posting result to API...
[executeIntent] API response status: 201
[Intents] Receiving result for <id>
[Intents] Result.result is array: true
[Intents] Result.result length: 150
[Intents] Result stored successfully
```

### 5. Potential Issues

**Hypothesis A: Empty array returned**
- `ps aux` might be failing
- Permission issues
- Platform detection incorrect

**Hypothesis B: Result not being stored**
- API in-memory Map clearing
- Wrong intent ID
- Serialization issue with large arrays

**Hypothesis C: UI display issue**
- `activity.result.result` path incorrect
- JSON.stringify failing on result
- Result structure mismatch

### 6. Possible Fixes

**If it's a parsing issue:**
- Improve parseUnixPs to handle COMMAND column with spaces
- Add error handling for empty ps output

**If it's a storage issue:**
- Switch from in-memory Map to database storage
- Add result size limits
- Fix serialization of large objects

**If it's a UI issue:**
- Fix result display path in activity rendering
- Add null checks and fallbacks
- Show array length even if can't display full array

## Current Status
⏳ Building desktop-app and api-gateway with enhanced logging
📝 Ready to test once builds complete
