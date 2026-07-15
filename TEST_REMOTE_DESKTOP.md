# Remote Desktop Testing Guide

## Prerequisites Setup

### 1. Start the API Server
```bash
cd /Users/david/Downloads/commandai
./START_API.sh
```

Keep this terminal open. The API will run on http://localhost:3000.

### 2. Verify API is Running
Open browser to: http://localhost:3000/health
Should see: `{"status":"ok"}`

### 3. Check Supabase Configuration
Ensure `apps/api-gateway/.env` has:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_key
SUPABASE_ANON_KEY=your_key
JWT_SECRET=your_secret
```

## Option 1: Test with Built App (Recommended)

### Install the App
```bash
open apps/desktop-app/release/Comandr-1.0.0-arm64.dmg
```

Drag Comandr to Applications folder.

### Grant Permissions
1. Open System Preferences → Security & Privacy
2. Go to Privacy tab
3. Enable for Comandr:
   - ✅ Screen Recording (required for screen capture)
   - ✅ Accessibility (required for input injection)

### First Launch
1. Open Comandr from Applications
2. App should appear in menu bar (system tray)
3. Click the tray icon
4. Login with your credentials

## Option 2: Test in Development Mode

### Start in Dev Mode
```bash
cd /Users/david/Downloads/commandai/apps/desktop-app
npm run dev
```

This opens the app without building/installing.

## Testing the Remote Desktop Feature

### Single Machine Test (Easiest)

Since you likely only have one machine, test the connection to itself:

1. **Launch the app** (either installed or dev mode)
2. **Login** with your account
3. **Navigate to Devices tab**
4. **Look for this device** in the list (should show your device registered)
5. **Click "Connect"** on your own device
6. **Observe**:
   - Session window should open
   - You should see your own screen mirrored
   - Console logs should show WebRTC connection establishing

### Check Console Logs

Open DevTools in the remote session window:
- Right-click in the session window
- Select "Inspect Element"
- Go to Console tab
- Look for these messages:

**Initiator side:**
```
[RemoteSession] Initiator sending offer
[RemoteSession] Added ICE candidate
[RemoteSession] Initiator received answer
[RemoteSession] Received remote track: video
[RemoteSession] Connection state: connected
```

**Target side (same machine):**
```
[RemoteSession] Target ready, waiting for offer
[RemoteSession] Setting up screen capture
[RemoteSession] Got screen stream
[RemoteSession] Adding video track
[RemoteSession] Target received offer
[RemoteSession] Target sending answer
[RemoteSession] Data channel opened
```

### Test Input Injection

**IMPORTANT**: When connecting to yourself, be careful - your mouse will control your own screen!

1. In the session window, move your mouse
2. Your actual mouse cursor should follow (with a slight delay)
3. Click somewhere - the click should register
4. Type on keyboard - text should appear

**Note**: This will feel recursive/weird when connecting to yourself. For real testing, use two separate devices.

### Two-Machine Test (Full Test)

If you have access to another Mac:

#### Device A (Initiator/Viewer)
1. Install and launch Comandr
2. Login with Account 1
3. Grant screen recording + accessibility permissions
4. Go to Devices tab
5. Wait for Device B to appear
6. Click "Connect" on Device B
7. Session window opens
8. You should see Device B's screen
9. Test input:
   - Move mouse over the video
   - Click on applications on Device B's screen
   - Type on keyboard
   - Use scroll wheel

#### Device B (Target/Being Controlled)
1. Install and launch Comandr  
2. Login with Account 1 (same account)
3. Grant screen recording + accessibility permissions
4. App runs in background
5. When Device A connects:
   - Notification appears
   - Session window opens automatically (showing your screen being shared)
6. Observe:
   - Your mouse should move when A moves theirs
   - Clicks should register
   - Keyboard input should appear

## Verification Checklist

### WebRTC Connection
- [ ] Offer is created by initiator
- [ ] Offer is received by target
- [ ] Answer is created by target
- [ ] Answer is received by initiator
- [ ] ICE candidates are exchanged
- [ ] Connection state reaches "connected"
- [ ] No errors in console

### Screen Sharing
- [ ] Target's screen appears in initiator's video element
- [ ] Video is clear and recognizable
- [ ] Video updates in real-time (15-60 fps)
- [ ] Video scales correctly to window size
- [ ] No frozen frames or black screen

### Input Injection - Mouse
- [ ] Mouse movements are transmitted
- [ ] Mouse cursor moves on target screen
- [ ] Coordinates are correctly translated
- [ ] Left click works
- [ ] Right click works  
- [ ] Scroll wheel works
- [ ] No lag > 200ms

### Input Injection - Keyboard
- [ ] Key presses are transmitted
- [ ] Characters appear correctly
- [ ] Modifiers work (Ctrl, Shift, Alt, Meta)
- [ ] Special keys work (arrows, function keys)
- [ ] No duplicate keystrokes
- [ ] No missed keystrokes

### Session Management
- [ ] Session creates successfully
- [ ] Session appears in API database
- [ ] Both windows open automatically
- [ ] Disconnect button works
- [ ] Session ends cleanly
- [ ] Windows close properly
- [ ] No zombie processes

### Error Handling
- [ ] No JavaScript errors in console
- [ ] No TypeScript compilation errors
- [ ] No Electron crashes
- [ ] Graceful handling of connection loss
- [ ] Proper error messages shown to user

## Debugging Tips

### If video doesn't appear:

1. **Check screen recording permission**:
   ```bash
   tccutil reset ScreenCapture com.electron.comandr
   ```
   Then restart app and grant permission.

2. **Check console for errors**:
   - Look for "Failed to capture screen"
   - Look for "desktopCapturer" errors
   - Look for WebRTC errors

3. **Verify screen sources are available**:
   Add this to remote-session.js before line 147:
   ```javascript
   console.log('[RemoteSession] Available sources:', sources.map(s => s.name));
   ```

### If input doesn't work:

1. **Check accessibility permission**:
   System Preferences → Security & Privacy → Privacy → Accessibility
   
2. **Check console logs**:
   - Look for "[Main] Injecting input" messages
   - Look for input injector errors

3. **Verify data channel is open**:
   Should see "[RemoteSession] Data channel opened"

4. **Check coordinate translation**:
   Add logging in main.ts:
   ```typescript
   console.log('[Main] Input event:', eventData, 'Translated to:', x, y);
   ```

### If signaling fails:

1. **Check API is running**: http://localhost:3000/health

2. **Check WebSocket connection** (if using WebSocket signaling)

3. **Verify both devices are registered**:
   API endpoint: GET http://localhost:3000/v1/devices

4. **Check signaling messages in console**:
   Both sides should show "Sending offer/answer/candidate"

### Common Issues:

**"Session not found"**:
- API database issue
- Session wasn't created properly
- Check network tab in DevTools

**"Connection failed"**:
- NAT/firewall blocking ICE candidates
- Need TURN server for non-local connections
- Check ICE candidate logs

**"Black screen"**:
- Screen recording permission denied
- Wrong display source selected
- Check desktopCapturer output

**"Mouse doesn't move"**:
- Accessibility permission denied
- Input injector not working on this OS
- Coordinate translation issue

## Performance Testing

### Measure Latency
1. Connect to remote device
2. Click "Show Stats" in session window
3. Check RTT (round-trip time)
4. Should be < 50ms on LAN

### Measure Frame Rate
1. Open Activity Monitor on target
2. Watch CPU usage while streaming
3. Should be < 50% CPU for 1080p @ 30fps

### Measure Bandwidth
1. Open Network tab in Activity Monitor  
2. Check network usage
3. Should be ~2-10 Mbps depending on quality

## Success Criteria

✅ **PASS** if all of these work:

1. ✅ WebRTC connection establishes
2. ✅ Video stream appears and updates
3. ✅ Mouse moves on target screen
4. ✅ Clicks register on target
5. ✅ Keyboard input works
6. ✅ Session disconnects cleanly
7. ✅ No errors in console
8. ✅ Latency < 100ms on LAN

❌ **FAIL** if any of these occur:

1. ❌ JavaScript errors in console
2. ❌ Black screen or no video
3. ❌ Input doesn't work at all
4. ❌ Connection fails to establish
5. ❌ App crashes
6. ❌ Signaling messages not received
7. ❌ Data channel doesn't open

## Next Steps After Testing

### If tests pass ✅:
1. Document working configuration
2. Test on different OS (Windows, Linux)
3. Test with multiple concurrent sessions
4. Add UI improvements
5. Implement file transfer UI
6. Implement clipboard sync UI

### If tests fail ❌:
1. Note exact error messages
2. Save console logs
3. Note which step failed
4. Check the debugging tips above
5. Review the code changes in REMOTE_DESKTOP_FIXES_APPLIED.md
6. Report specific issues

## Quick Test Script

```bash
#!/bin/bash
# Quick test of remote desktop functionality

echo "🧪 Remote Desktop Test Script"
echo "=============================="
echo ""

# 1. Check if API is running
echo "1. Checking API..."
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "   ✅ API is running"
else
    echo "   ❌ API is NOT running"
    echo "   → Start it with: ./START_API.sh"
    exit 1
fi

# 2. Check if app is built
echo "2. Checking app build..."
if [ -f "apps/desktop-app/release/Comandr-1.0.0-arm64.dmg" ]; then
    echo "   ✅ App is built"
else
    echo "   ❌ App is NOT built"
    echo "   → Build it with: npm run build"
    exit 1
fi

# 3. Check if screen recording permission granted
echo "3. Checking permissions..."
echo "   ⚠️  Manual check required:"
echo "   → System Preferences → Security & Privacy → Screen Recording"
echo "   → System Preferences → Security & Privacy → Accessibility"
echo ""

# 4. Instructions
echo "4. Test Instructions:"
echo "   → Install: open apps/desktop-app/release/Comandr-1.0.0-arm64.dmg"
echo "   → Launch Comandr from Applications"
echo "   → Login with your account"
echo "   → Go to Devices tab"
echo "   → Click 'Connect' on a device"
echo "   → Open DevTools and check console"
echo ""
echo "✅ All prerequisites met! Ready for testing."
```

Save as `test-remote-desktop.sh`, make executable:
```bash
chmod +x test-remote-desktop.sh
./test-remote-desktop.sh
```
