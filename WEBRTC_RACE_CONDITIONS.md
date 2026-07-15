# 🏎️ WEBRTC RACE CONDITIONS AUDIT - Comandr Remote Desktop

**Date:** 2026-07-14  
**Status:** 10 CRITICAL RACE CONDITIONS FOUND  
**Impact:** Connection failures, orphaned sessions, crashes

---

## 🚨 TOP 10 RACE CONDITIONS

### 1. ICE Candidates Added Before setRemoteDescription
**Risk:** HIGH  
**File:** `apps/desktop-app/src/remote-session.js`  
**Lines:** 246-249

**Issue:**
ICE candidates can arrive before offer/answer, causing InvalidStateError.

**Scenario:**
1. Initiator sends offer + ICE candidates rapidly
2. Network/IPC reordering causes ICE to arrive first
3. Target calls `addIceCandidate()` before `setRemoteDescription()`
4. WebRTC throws InvalidStateError

**Fix:**
```javascript
let pendingIceCandidates = [];
let remoteDescriptionSet = false;

async function handleSignalingMessage(event, message) {
  if (message.iceCandidate) {
    if (!remoteDescriptionSet) {
      pendingIceCandidates.push(message.iceCandidate);
      return;
    }
    await peerConnection.addIceCandidate(new RTCIceCandidate(message.iceCandidate));
  } 
  
  if (message.offer || message.answer) {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(message.offer || message.answer)
    );
    remoteDescriptionSet = true;
    
    // Drain queued ICE candidates
    for (const ice of pendingIceCandidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
    }
    pendingIceCandidates = [];
    
    if (message.offer) {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      ipcRenderer.send('remote-signaling', { sessionId, answer });
    }
  }
}
```

---

### 2. Global Signaling Callback Overwritten by Multiple Sessions
**Risk:** HIGH  
**File:** `apps/desktop-app/src/main.ts`  
**Lines:** 1178-1179

**Issue:**
Only one session receives signaling messages when multiple sessions open.

**Scenario:**
1. User opens remote session A (sessionId: "abc")
2. `setRemoteSignalingCallback()` registers handler for session A
3. User opens remote session B (sessionId: "xyz")
4. Handler overwritten → Session A stops receiving messages

**Fix:**
```typescript
// In DesktopAgent class
private signalHandlers: Map<string, (message: any) => void> = new Map();

addRemoteSignalingCallback(sessionId: string, callback: (message: any) => void) {
  this.signalHandlers.set(sessionId, callback);
}

removeRemoteSignalingCallback(sessionId: string) {
  this.signalHandlers.delete(sessionId);
}

async handleRemoteSignalingMessage(message: any) {
  const { sessionId } = message;
  const handler = this.signalHandlers.get(sessionId);
  
  if (handler) {
    handler(message);
  } else {
    console.warn(`No handler for session ${sessionId}`);
  }
}

// In main.ts
sessionWindow.on("closed", () => {
  this.agent.removeRemoteSignalingCallback(sessionId);
  this.remoteSessionWindows.delete(sessionId);
});
```

---

### 3. Data Channel Onopen Handler Set After Channel Opens
**Risk:** MEDIUM  
**File:** `apps/desktop-app/src/remote-session.js`  
**Lines:** 102-134

**Issue:**
Data channel can open before `onopen` handler is attached.

**Scenario:**
1. Initiator creates data channel at line 104
2. Creates offer at lines 121-125
3. Connection establishes very quickly (LAN)
4. Data channel opens BEFORE line 108 sets handler
5. App never knows channel is open

**Fix:**
```javascript
if (role === 'initiator') {
  dataChannel = peerConnection.createDataChannel('input', { ordered: true });
  
  // Set handlers IMMEDIATELY after creating channel
  dataChannel.onopen = () => {
    console.log('[WebRTC] Data channel opened');
  };
  dataChannel.onclose = () => {
    console.log('[WebRTC] Data channel closed');
  };
  dataChannel.onerror = (error) => {
    console.error('[WebRTC] Data channel error:', error);
  };
  
  // Now do async work
  const offer = await peerConnection.createOffer({
    offerToReceiveVideo: true,
    offerToReceiveAudio: false,
  });
  
  await peerConnection.setLocalDescription(offer);
  ipcRenderer.send('remote-signaling', { 
    sessionId, 
    offer: { sdp: offer.sdp, type: offer.type }
  });
}
```

---

### 4. Target's Ondatachannel Handler Races with Messages
**Risk:** MEDIUM  
**File:** `apps/desktop-app/src/remote-session.js`  
**Lines:** 137-154

**Issue:**
Data channel may already have queued messages when `onmessage` handler is attached.

**Fix:**
```javascript
peerConnection.ondatachannel = (event) => {
  dataChannel = event.channel;
  
  // Set ALL handlers immediately and atomically
  dataChannel.onopen = () => {
    console.log('[WebRTC] Data channel opened');
  };
  
  dataChannel.onclose = () => {
    console.log('[WebRTC] Data channel closed');
  };
  
  dataChannel.onerror = (error) => {
    console.error('[WebRTC] Data channel error:', error);
  };
  
  dataChannel.onmessage = handleDataChannelMessage;
  
  // Check state immediately
  if (dataChannel.readyState === 'open') {
    console.log('[WebRTC] Channel already open on arrival');
  }
};
```

---

### 5. Async Signaling Handler with No Error Response
**Risk:** MEDIUM  
**File:** `apps/desktop-app/src/main.ts`  
**Lines:** 1031-1053

**Issue:**
Renderer has no idea if signaling message succeeded or failed.

**Fix:**
```typescript
// Change from ipcMain.on to ipcMain.handle
ipcMain.handle("remote-signaling", async (event, message) => {
  try {
    const { sessionId, offer, answer, iceCandidate } = message;
    
    const agentMessage: any = {
      session_id: sessionId,
    };
    
    if (offer) agentMessage.offer = offer;
    if (answer) agentMessage.answer = answer;
    if (iceCandidate) {
      agentMessage.ice_candidate = {
        candidate: iceCandidate.candidate,
        sdp_mid: iceCandidate.sdpMid,
        sdp_m_line_index: iceCandidate.sdpMLineIndex,
      };
    }
    
    await this.agent.handleRemoteSignalingMessage(agentMessage);
    return { success: true };
    
  } catch (error) {
    console.error('[Main] Signaling failed:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
});

// In remote-session.js
const result = await ipcRenderer.invoke('remote-signaling', {
  sessionId,
  offer,
  answer,
  iceCandidate
});

if (!result.success) {
  showError('Connection failed: ' + result.error);
}
```

---

### 6. Double Cleanup on Window Close
**Risk:** MEDIUM  
**File:** `apps/desktop-app/src/remote-session.js`  
**Lines:** 531-539

**Issue:**
Disconnect and beforeunload both call cleanup, causing errors.

**Fix:**
```javascript
let isCleaningUp = false;

async function disconnectSession() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  
  cleanup();
  
  try {
    await ipcRenderer.invoke('remote-end-session', sessionId);
  } catch (error) {
    console.error('Failed to end session:', error);
  }
  
  window.close();
}

window.addEventListener('beforeunload', () => {
  if (isCleaningUp) return;
  isCleaningUp = true;
  
  cleanup();
  ipcRenderer.removeAllListeners('remote-signaling-message');
});

function cleanup() {
  if (dataChannel && dataChannel.readyState !== 'closed') {
    dataChannel.close();
  }
  
  if (peerConnection && peerConnection.connectionState !== 'closed') {
    peerConnection.close();
  }
  
  if (videoElement && videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
  }
}
```

---

### 7. Remote Session Client Missing ICE Candidate Queue
**Risk:** HIGH  
**File:** `apps/desktop-agent/src/remote-session-client.ts`  
**Lines:** 329-344

**Issue:**
Same as finding #1 but in desktop-agent code path.

**Fix:**
```typescript
private pendingIceCandidates: RTCIceCandidateInit[] = [];
private remoteDescriptionSet = false;

async handleOffer(sdp: string): Promise<void> {
  await this.peerConnection.setRemoteDescription({ 
    type: 'offer', 
    sdp 
  });
  
  this.remoteDescriptionSet = true;
  await this.drainIceCandidates();
  
  const answer = await this.peerConnection.createAnswer();
  await this.peerConnection.setLocalDescription(answer);
  
  // Send answer via signaling
  await this.sendSignalingMessage({ answer: { 
    sdp: answer.sdp, 
    type: answer.type 
  }});
}

async handleAnswer(sdp: string): Promise<void> {
  await this.peerConnection.setRemoteDescription({ 
    type: 'answer', 
    sdp 
  });
  
  this.remoteDescriptionSet = true;
  await this.drainIceCandidates();
}

async handleICECandidate(
  candidate: string, 
  sdpMid: string, 
  sdpMLineIndex: number
): Promise<void> {
  const ice = { candidate, sdpMid, sdpMLineIndex };
  
  if (!this.remoteDescriptionSet) {
    this.pendingIceCandidates.push(ice);
    console.log('[WebRTC] Queued ICE candidate (remote desc not set yet)');
    return;
  }
  
  await this.peerConnection.addIceCandidate(ice);
}

private async drainIceCandidates(): Promise<void> {
  console.log(`[WebRTC] Draining ${this.pendingIceCandidates.length} queued ICE candidates`);
  
  for (const ice of this.pendingIceCandidates) {
    try {
      await this.peerConnection.addIceCandidate(ice);
    } catch (error) {
      console.error('[WebRTC] Failed to add queued ICE candidate:', error);
    }
  }
  
  this.pendingIceCandidates = [];
}
```

---

### 8. Duplicate Session Windows on Rapid Clicks
**Risk:** LOW  
**File:** `apps/desktop-app/src/main.ts`  
**Lines:** 1110-1118

**Issue:**
Double-click "Connect" button opens two windows for same session.

**Fix:**
```typescript
private creatingWindows = new Set<string>();

private openRemoteSessionWindow(
  sessionId: string, 
  targetDeviceId: string, 
  role: 'initiator' | 'target'
) {
  // Check if already creating
  if (this.creatingWindows.has(sessionId)) {
    console.log(`[Main] Already creating window for session ${sessionId}`);
    return;
  }
  
  // Check if window exists
  if (this.remoteSessionWindows.has(sessionId)) {
    const existingWindow = this.remoteSessionWindows.get(sessionId);
    existingWindow?.focus();
    return;
  }
  
  this.creatingWindows.add(sessionId);
  
  const sessionWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Remote Session',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  
  this.remoteSessionWindows.set(sessionId, sessionWindow);
  this.creatingWindows.delete(sessionId);
  
  sessionWindow.on("closed", () => {
    this.remoteSessionWindows.delete(sessionId);
    this.agent.removeRemoteSignalingCallback(sessionId);
  });
  
  // Load window content...
}
```

---

### 9. Async handleSignalingMessage Without Await
**Risk:** MEDIUM  
**File:** `apps/desktop-agent/src/executors/remote-executor.ts`  
**Lines:** 470-487

**Issue:**
Race condition when multiple signaling messages arrive rapidly.

**Fix:**
```typescript
async handleSignalingMessage(message: any): Promise<void> {
  const { sessionId, offer, answer, ice_candidate } = message;
  
  if (!sessionId) {
    console.error('[RemoteExecutor] Signaling message missing sessionId');
    return;
  }

  try {
    // AWAIT the async operation
    await this.connectSession({
      sessionId,
      offer: offer?.sdp,
      answer: answer?.sdp,
      iceCandidate: ice_candidate,
    });
  } catch (error) {
    console.error('[RemoteExecutor] Failed to handle signaling:', error);
  }
}
```

---

### 10. Screen Capture Added Before Offer Negotiation
**Risk:** MEDIUM  
**File:** `apps/desktop-app/src/remote-session.js`  
**Lines:** 168-217

**Issue:**
Target adds video track before receiving offer, causing SDP mismatch.

**Scenario:**
1. Target calls `initializeConnection()`
2. `setupScreenCapture()` called immediately
3. Video tracks added to peer connection
4. Offer arrives (only expects data channel)
5. Answer includes video track not in offer
6. Video never flows

**Fix:**
```javascript
async function handleSignalingMessage(event, message) {
  if (message.offer) {
    // Set remote description FIRST
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(message.offer)
    );
    
    // NOW add video track (will be included in answer)
    if (role === 'target') {
      await setupScreenCapture();
    }
    
    // Drain queued ICE candidates
    remoteDescriptionSet = true;
    for (const ice of pendingIceCandidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
    }
    pendingIceCandidates = [];
    
    // Create answer with video track
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    ipcRenderer.send('remote-signaling', {
      sessionId,
      answer: { sdp: answer.sdp, type: answer.type }
    });
  }
  
  // Handle ICE candidates...
}
```

---

## 📊 SUMMARY

| Issue Type | Count | Priority |
|------------|-------|----------|
| Connection failures | 4 | 🔴 Critical |
| Orphaned sessions | 3 | 🔴 Critical |
| Message loss | 2 | ⚠️ High |
| State races | 1 | ⚠️ High |

---

## ✅ FIX PRIORITY

1. **ICE candidate queueing** (Findings #1, #7) - Prevents connection failures
2. **Per-session signaling** (Finding #2) - Prevents orphaned sessions
3. **Error handling on IPC** (Finding #5) - Better error visibility
4. **Data channel handler timing** (Findings #3, #4) - Prevents message loss
5. **Cleanup coordination** (Finding #6) - Prevents crashes on disconnect

**Estimated fix time: 3-4 hours**

---

## 🧪 TESTING RECOMMENDATIONS

After fixes:
1. Test rapid connection/disconnection cycles
2. Test multiple simultaneous sessions
3. Test on slow networks (add artificial latency)
4. Test when API is slow to respond
5. Test connection while navigating away from page

---

**These race conditions can cause intermittent connection failures in production.**  
**Recommend fixing before wide deployment.**
