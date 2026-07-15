# 🚀 Quick Start - Remote Desktop Testing

## From Your Terminal (You're at `~`):

```bash
# Navigate to the project
cd /Users/david/Downloads/commandai

# Install the app
open apps/desktop-app/release/Comandr-1.0.0-arm64.dmg
```

## Installation Steps

1. **DMG will open** - You'll see a Comandr icon
2. **Drag to Applications** folder
3. **Eject the DMG**
4. **Open Comandr** from Applications

## Grant Permissions (REQUIRED)

When you first launch, macOS will ask for permissions:

### Screen Recording Permission
1. System Preferences → Security & Privacy
2. Privacy tab → Screen Recording
3. ✅ Check "Comandr"

### Accessibility Permission  
1. System Preferences → Security & Privacy
2. Privacy tab → Accessibility
3. ✅ Check "Comandr"

**Without these, remote desktop won't work!**

## Before Testing - Start the API

The desktop app needs the API server running:

```bash
cd /Users/david/Downloads/commandai

# Start the API (keep this terminal open)
./START_API.sh
```

You should see:
```
🚀 Starting Comandr API Gateway...
The API will run on http://localhost:3000
```

## Quick Test (Single Machine)

Since you likely have one machine, test by connecting to yourself:

1. **Launch Comandr** from Applications
2. **Login** with your account
3. **Click the menu bar icon** (top right of screen)
4. **Go to "Devices" tab**
5. **Find your device** in the list
6. **Click "Connect"** on your own device

### What Should Happen:

- ✅ Session window opens
- ✅ You see your own screen in the window
- ✅ Console shows WebRTC connection logs
- ✅ Mouse movements control your screen (recursive!)

### Check the Console:

1. In the session window, right-click
2. Select "Inspect Element"
3. Go to Console tab
4. Look for these messages:

```
[RemoteSession] Initiator sending offer
[RemoteSession] Setting up screen capture
[RemoteSession] Got screen stream
[RemoteSession] Target sending answer
[RemoteSession] Connection state: connected
[RemoteSession] Data channel opened
```

## If Something Goes Wrong

### "DMG not found" error
You're in the wrong directory. Run:
```bash
cd /Users/david/Downloads/commandai
```

### "Permission denied" when capturing screen
Grant Screen Recording permission:
System Preferences → Security & Privacy → Screen Recording → ✅ Comandr

### "Input doesn't work"
Grant Accessibility permission:
System Preferences → Security & Privacy → Accessibility → ✅ Comandr

### "Can't connect to API"
Start the API:
```bash
cd /Users/david/Downloads/commandai
./START_API.sh
```

### "No devices shown"
1. Check API is running (http://localhost:3000/health)
2. Check you're logged in
3. Wait a few seconds for device registration

## Development Mode (Alternative to Installing)

If you want to test without installing:

```bash
cd /Users/david/Downloads/commandai/apps/desktop-app
npm run dev
```

This launches the app directly from source.

## Verification Checklist

Run the automated verification:

```bash
cd /Users/david/Downloads/commandai
./test-remote-desktop.sh
```

Should show all ✅ checks passed.

## Full Testing Guide

For complete testing instructions, see:
- **TEST_REMOTE_DESKTOP.md** - Complete testing checklist
- **REMOTE_DESKTOP_COMPLETE.md** - Architecture and details

## Quick Commands Reference

```bash
# Navigate to project
cd /Users/david/Downloads/commandai

# Install app
open apps/desktop-app/release/Comandr-1.0.0-arm64.dmg

# Start API
./START_API.sh

# Run verification
./test-remote-desktop.sh

# Dev mode
cd apps/desktop-app && npm run dev

# Rebuild if needed
npm run build
```

## What Works

✅ Device discovery  
✅ WebRTC connection  
✅ Screen streaming  
✅ Mouse control  
✅ Keyboard control  
✅ Session management  

## Need Help?

Check the documentation:
- `REMOTE_DESKTOP_COMPLETE.md` - Overview
- `REMOTE_DESKTOP_FIXES_APPLIED.md` - Technical details
- `TEST_REMOTE_DESKTOP.md` - Full testing guide

---

**Status**: ✅ Ready to test  
**Build**: 1.0.0-arm64  
**Size**: 115 MB  
**Platform**: macOS 14+ (arm64)
