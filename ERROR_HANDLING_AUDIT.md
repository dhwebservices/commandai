# ⚠️ ERROR HANDLING & EDGE CASES AUDIT - Comandr Remote Desktop

**Date:** 2026-07-14  
**Status:** 10 CRITICAL ERROR HANDLING GAPS FOUND  
**Impact:** App hangs, crashes, silent failures

---

## 🚨 TOP 10 ERROR HANDLING ISSUES

### 1. Unhandled Network Failure During Login - No Timeout
**Risk:** HIGH  
**File:** `apps/desktop-app/src/main.ts`  
**Lines:** 434-474  
**Trigger:** API server down, network loss, or DNS failure during app launch or login  
**Impact:** App hangs indefinitely on login screen, no error shown to user, frozen UI

**Fix:**
```typescript
ipcMain.handle("login", async (event, { email, password }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch(`${API_BASE}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }
    
    const data = await response.json();
    // ... rest of login logic
    
  } catch (error: any) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: "Cannot reach server. Check your internet connection.",
      };
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: "Server is unreachable. Please try again later.",
      };
    }
    
    return {
      success: false,
      error: error.message || "Login failed",
    };
  }
});
```

---

### 2. Intent Polling with No Error Handling for Sustained Failures
**Risk:** HIGH  
**File:** `apps/desktop-app/src/main.ts`  
**Lines:** 1428-1445  
**Trigger:** API becomes unreachable after successful login (WiFi drops, VPN disconnect)  
**Impact:** Silent failure, commands stop working, user unaware, background polling continues

**Fix:**
```typescript
private intentPollInterval: NodeJS.Timeout | null = null;
private intentPollFailureCount = 0;
private intentPollDelay = 5000; // Start at 5s

private async checkForIntents() {
  if (!this.currentUser) return;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
  try {
    const response = await fetch(
      `${API_BASE}/v1/intents/pending?device_id=${this.deviceId}`,
      {
        headers: { Authorization: `Bearer ${this.authToken}` },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const { intents } = await response.json();
    
    // Success: reset failure count and delay
    this.intentPollFailureCount = 0;
    this.intentPollDelay = 5000;
    
    for (const intent of intents) {
      await this.processIntent(intent);
    }
    
  } catch (error) {
    clearTimeout(timeout);
    this.intentPollFailureCount++;
    
    console.error(`[Intent Poll] Failure #${this.intentPollFailureCount}:`, error);
    
    // Exponential backoff: 5s → 10s → 20s → 40s → 60s (max)
    this.intentPollDelay = Math.min(
      5000 * Math.pow(2, this.intentPollFailureCount - 1),
      60000
    );
    
    // Circuit breaker: after 5 failures, show offline indicator
    if (this.intentPollFailureCount >= 5) {
      this.showOfflineIndicator();
    }
  }
  
  // Schedule next poll with current delay
  this.intentPollInterval = setTimeout(
    () => this.checkForIntents(),
    this.intentPollDelay
  );
}

private showOfflineIndicator() {
  // Show system notification
  new Notification('Comandr Offline', {
    body: 'Cannot reach server. Commands may not work.',
  });
  
  // Update tray icon to show offline state
  if (this.tray) {
    this.tray.setImage(nativeImage.createFromPath('assets/icon-offline.png'));
  }
}
```

---

### 3. Heartbeat with No Timeout or Retry Logic
**Risk:** HIGH  
**File:** `apps/desktop-agent/src/index.ts`  
**Lines:** 98-120  
**Trigger:** Network partition, firewall blocks response, API slow to respond  
**Impact:** Agent appears online but is stuck waiting, device marked offline incorrectly

**Fix:**
```typescript
private async sendHeartbeat(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
  
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(`${this.apiUrl}/v1/devices/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          device_id: this.deviceId,
          status: "online",
          last_seen_at: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Success
      return;
      
    } catch (error) {
      retries++;
      clearTimeout(timeout);
      
      console.error(`[Heartbeat] Attempt ${retries}/${maxRetries} failed:`, error);
      
      if (retries < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => 
          setTimeout(resolve, 1000 * Math.pow(2, retries - 1))
        );
      } else {
        console.error('[Heartbeat] All retries exhausted');
      }
    }
  }
}
```

---

### 4. Session Close Sends Message AFTER Closing Connection
**Risk:** MEDIUM  
**File:** `apps/desktop-agent/src/remote-session-client.ts`  
**Lines:** 620-646  
**Trigger:** User closes remote session window or network drops mid-session  
**Impact:** Remote peer never notified, session stays "active" in DB, orphaned resources

**Fix:**
```typescript
async close(): Promise<void> {
  if (this.isClosed) return;
  this.isClosed = true;
  
  // 1. Send disconnect message FIRST (with timeout)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    
    await this.sendSignalingMessage({ 
      type: 'disconnect',
      session_id: this.sessionId 
    });
    
    clearTimeout(timeout);
  } catch (error) {
    console.error('[RemoteSession] Failed to send disconnect:', error);
    // Continue with cleanup even if send fails
  }
  
  // 2. Close data channel
  if (this.dataChannel) {
    this.dataChannel.close();
    this.dataChannel = null;
  }
  
  // 3. Close peer connection
  if (this.peerConnection) {
    this.peerConnection.close();
    this.peerConnection = null;
  }
  
  // 4. Stop video tracks
  if (this.localStream) {
    this.localStream.getTracks().forEach(track => track.stop());
    this.localStream = null;
  }
  
  console.log('[RemoteSession] Cleanup complete');
}
```

---

### 5. JSON.parse Without Try-Catch in Session Creation
**Risk:** MEDIUM  
**File:** `apps/desktop-app/src/main.ts`  
**Lines:** 912-916  
**Trigger:** API returns non-JSON error (HTML 502/503 from proxy, plain text)  
**Impact:** App crash with "Unexpected token < in JSON"

**Fix:**
```typescript
ipcMain.handle("create-remote-session", async (event, targetDeviceId) => {
  try {
    const response = await fetch(`${API_BASE}/v1/remote-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        target_device_id: targetDeviceId,
        tenant_id: this.currentUser.tenant_id,
        session_type: "interactive",
      }),
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        // Try to parse JSON error
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        // Not JSON - get text instead
        try {
          const errorText = await response.text();
          errorMessage = errorText.substring(0, 200); // First 200 chars
        } catch {
          // Can't even get text - use status code
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
    
    const session = await response.json();
    return { success: true, session };
    
  } catch (error: any) {
    console.error('[Main] Failed to create session:', error);
    return {
      success: false,
      error: error.message || "Failed to create session",
    };
  }
});
```

---

### 6. Intent Result Reporting Failure Not Retried
**Risk:** MEDIUM  
**File:** `apps/desktop-app/src/main.ts`  
**Lines:** 1464-1475  
**Trigger:** API temporarily down after intent executes successfully  
**Impact:** Intent executes (file deleted) but result never recorded, user sees "pending" forever

**Fix:**
```typescript
// Add IndexedDB for failed report queue
import Dexie from 'dexie';

class IntentResultQueue extends Dexie {
  results!: Dexie.Table<{
    intent_id: string;
    result: any;
    created_at: number;
    retry_count: number;
  }>;
  
  constructor() {
    super('IntentResults');
    this.version(1).stores({
      results: 'intent_id, created_at',
    });
  }
}

const resultQueue = new IntentResultQueue();

private async reportIntentResult(intentId: string, result: any) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(
      `${API_BASE}/v1/intents/${intentId}/result`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ result }),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // Success - remove from queue if it was there
    await resultQueue.results.delete(intentId);
    
  } catch (error) {
    console.error('[Intent] Failed to report result:', error);
    
    // Queue for retry
    await resultQueue.results.put({
      intent_id: intentId,
      result,
      created_at: Date.now(),
      retry_count: 0,
    });
  }
}

// Retry failed reports on next poll cycle
private async retryFailedIntentResults() {
  const failedResults = await resultQueue.results
    .where('retry_count')
    .below(5)
    .toArray();
  
  for (const item of failedResults) {
    try {
      await this.reportIntentResult(item.intent_id, item.result);
    } catch (error) {
      // Increment retry count
      await resultQueue.results.update(item.intent_id, {
        retry_count: item.retry_count + 1,
      });
    }
  }
  
  // Delete items that failed 5 times (give up)
  await resultQueue.results
    .where('retry_count')
    .aboveOrEqual(5)
    .delete();
}
```

---

### 7. Device Status Check Doesn't Validate Heartbeat Recency
**Risk:** MEDIUM  
**File:** `apps/api-gateway/src/modules/remote-sessions/remote-sessions.service.ts`  
**Lines:** 80-84  
**Trigger:** Device marked "online" but heartbeat is 5 minutes old (crashed silently)  
**Impact:** User initiates session to dead device, stuck in "connecting" state

**Fix:**
```typescript
async createSession(dto: CreateSessionDto): Promise<any> {
  // Check if target device exists and is ACTUALLY online
  const device = await this.supabase
    .from('devices')
    .select('*')
    .eq('id', dto.target_device_id)
    .single();
  
  if (!device.data) {
    throw new NotFoundException('Target device not found');
  }
  
  // Check heartbeat recency (must be within last 30 seconds)
  const lastSeenAt = new Date(device.data.last_seen_at);
  const now = new Date();
  const secondsSinceLastSeen = (now.getTime() - lastSeenAt.getTime()) / 1000;
  
  if (secondsSinceLastSeen > 30) {
    throw new BadRequestException(
      `Device is offline (last seen ${Math.floor(secondsSinceLastSeen)}s ago)`
    );
  }
  
  if (device.data.status !== 'online') {
    throw new BadRequestException('Device is not online');
  }
  
  // Proceed with session creation...
}
```

---

### 8. addIceCandidate Catches Error But Connection Never Recovers
**Risk:** MEDIUM  
**File:** `apps/desktop-agent/src/remote-session-client.ts`  
**Lines:** 329-345  
**Trigger:** ICE candidate arrives before setRemoteDescription, or malformed candidate  
**Impact:** Connection fails silently, session stuck in "connecting"

**Fix:**
```typescript
async handleICECandidate(
  candidate: string,
  sdpMid: string,
  sdpMLineIndex: number
): Promise<void> {
  const ice = { candidate, sdpMid, sdpMLineIndex };
  
  // Queue if remote description not set yet
  if (!this.remoteDescriptionSet) {
    this.pendingIceCandidates.push(ice);
    console.log('[WebRTC] Queued ICE candidate (remote desc not set)');
    return;
  }
  
  try {
    await this.peerConnection.addIceCandidate(ice);
    console.log('[WebRTC] Added ICE candidate');
    
  } catch (error) {
    console.error('[WebRTC] Failed to add ICE candidate:', error);
    
    // Notify user of connection issue
    this.emit('connection-error', {
      type: 'ice-candidate-failed',
      message: 'Connection setup failed. Please try reconnecting.',
    });
    
    // Don't throw - let other candidates try
    // Connection might still succeed with remaining candidates
  }
}
```

---

### 9. startDesktopAgent Doesn't Handle Spawn Failure
**Risk:** MEDIUM  
**File:** `apps/desktop-app/src/main.ts`  
**Lines:** 1380-1418  
**Trigger:** desktop-agent binary missing, permissions denied, or wrong path  
**Impact:** App thinks agent is running but it's not, device never registers

**Fix:**
```typescript
private async startDesktopAgent() {
  if (this.agentProcess) {
    console.log('[Agent] Already running');
    return;
  }
  
  const agentPath = app.isPackaged
    ? path.join(process.resourcesPath, 'desktop-agent')
    : path.join(__dirname, '../../desktop-agent/dist/index.js');
  
  console.log('[Agent] Starting from:', agentPath);
  
  // Check if file exists
  if (!fs.existsSync(agentPath)) {
    const error = `Agent binary not found at ${agentPath}`;
    console.error('[Agent]', error);
    
    dialog.showErrorBox(
      'Comandr Agent Error',
      `Cannot start background agent: ${error}`
    );
    
    return;
  }
  
  try {
    this.agentProcess = spawn(
      app.isPackaged ? agentPath : 'node',
      app.isPackaged ? [] : [agentPath],
      {
        env: {
          ...process.env,
          API_URL: API_BASE,
          AUTH_TOKEN: this.authToken,
          DEVICE_ID: this.deviceId,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    
    // Handle spawn errors BEFORE they crash
    this.agentProcess.on('error', (error) => {
      console.error('[Agent] Spawn error:', error);
      
      dialog.showErrorBox(
        'Comandr Agent Error',
        `Failed to start background agent: ${error.message}`
      );
      
      this.agentProcess = null;
    });
    
    // Monitor exit
    this.agentProcess.on('exit', (code, signal) => {
      console.log(`[Agent] Exited with code ${code}, signal ${signal}`);
      this.agentProcess = null;
      
      if (code !== 0 && code !== null) {
        // Unexpected exit - show error
        dialog.showErrorBox(
          'Comandr Agent Stopped',
          `Background agent exited unexpectedly (code ${code})`
        );
      }
    });
    
    // Log output
    this.agentProcess.stdout?.on('data', (data) => {
      console.log('[Agent]', data.toString().trim());
    });
    
    this.agentProcess.stderr?.on('data', (data) => {
      console.error('[Agent]', data.toString().trim());
    });
    
    console.log('[Agent] Started with PID:', this.agentProcess.pid);
    
  } catch (error: any) {
    console.error('[Agent] Failed to start:', error);
    
    dialog.showErrorBox(
      'Comandr Agent Error',
      `Cannot start background agent: ${error.message}`
    );
  }
}
```

---

### 10. Command Processor Fetch with No Timeout
**Risk:** LOW-MEDIUM  
**File:** `apps/desktop-app/src/command-processor.ts`  
**Lines:** 70-82 & 98-110  
**Trigger:** API gateway slow (20s+ response time), overloaded, or stuck  
**Impact:** Command input hangs, UI frozen waiting for response

**Fix:**
```typescript
async submitCommand(text: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
  
  try {
    const response = await fetch(`${API_BASE}/v1/commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error: any) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      // Timeout - fall back to local processing immediately
      console.warn('[Commands] Server timeout, using local fallback');
      return this.processLocally(text);
    }
    
    throw error;
  }
}
```

---

## 📊 SUMMARY

| Category | Count | Priority |
|----------|-------|----------|
| Network timeouts missing | 5 | 🔴 Critical |
| Silent failures | 3 | 🔴 Critical |
| State validation gaps | 2 | ⚠️ High |

---

## ✅ FIX PRIORITY

1. **Add timeouts to all fetch calls** (Findings #1, #2, #3, #10)
2. **Implement retry logic with backoff** (Findings #2, #3, #6)
3. **Add connection status indicators** (Finding #2)
4. **Validate device heartbeat recency** (Finding #7)
5. **Handle spawn failures** (Finding #9)

**Estimated fix time: 4-5 hours**

---

**These error handling gaps will cause production app hangs and silent failures.**  
**Recommend fixing before wide deployment.**
