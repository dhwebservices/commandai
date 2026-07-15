// Remote Session Window JavaScript
const { ipcRenderer } = require('electron');

let sessionId = null;
let peerConnection = null;
let dataChannel = null;
let remoteDeviceId = null;
let isConnected = false;

// Role: 'initiator' (viewing) or 'target' (being viewed)
let role = 'initiator';

// FIX: Queue for ICE candidates that arrive before setRemoteDescription
let pendingIceCandidates = [];
let remoteDescriptionSet = false;

// Initialize session from query parameters
window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  sessionId = urlParams.get('sessionId');
  remoteDeviceId = urlParams.get('deviceId');
  role = urlParams.get('role') || 'initiator';

  if (!sessionId) {
    showError('Invalid session parameters');
    return;
  }

  // Set up WebRTC connection
  await initializeConnection();

  // Set up input capture (only for initiator)
  if (role === 'initiator') {
    setupInputCapture();
  }

  // Start connection stats monitoring
  startStatsMonitoring();
});

// Initialize WebRTC connection
async function initializeConnection() {
  try {
    updateStatus('connecting', 'Establishing connection...');

    // Create RTCPeerConnection
    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // If we're the target, capture screen and add video track
    if (role === 'target') {
      await setupScreenCapture();
    }

    // Handle incoming video stream (for initiator)
    peerConnection.ontrack = (event) => {
      console.log('[RemoteSession] Received remote track:', event.track.kind);
      const video = document.getElementById('remoteVideo');
      if (event.streams && event.streams[0]) {
        video.srcObject = event.streams[0];
        hideLoading();
        updateStatus('connected', 'Connected');
        isConnected = true;
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[RemoteSession] Sending ICE candidate');
        ipcRenderer.send('remote-signaling', {
          sessionId,
          iceCandidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('[RemoteSession] Connection state:', peerConnection.connectionState);
      switch (peerConnection.connectionState) {
        case 'connected':
          updateStatus('connected', 'Connected');
          hideLoading();
          isConnected = true;
          break;
        case 'disconnected':
        case 'failed':
          updateStatus('disconnected', 'Connection lost');
          showError('Connection failed or lost');
          break;
        case 'closed':
          updateStatus('disconnected', 'Disconnected');
          break;
      }
    };

    // Listen for signaling messages
    ipcRenderer.on('remote-signaling-message', handleSignalingMessage);

    // Initiator creates offer, Target waits for offer
    if (role === 'initiator') {
      // Create data channel for input events (initiator only)
      dataChannel = peerConnection.createDataChannel('input', {
        ordered: true,
      });

      // FIX: Set all handlers IMMEDIATELY after creating channel
      dataChannel.onopen = () => {
        console.log('[RemoteSession] Data channel opened');
      };

      dataChannel.onclose = () => {
        console.log('[RemoteSession] Data channel closed');
      };

      dataChannel.onerror = (error) => {
        console.error('[RemoteSession] Data channel error:', error);
      };

      // Now do async work
      // Initiator: Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false,
      });
      await peerConnection.setLocalDescription(offer);

      console.log('[RemoteSession] Initiator sending offer');
      // FIX: Use invoke instead of send for error handling
      const result = await ipcRenderer.invoke('remote-signaling', {
        sessionId,
        offer: {
          sdp: offer.sdp,
          type: offer.type,
        },
      });

      if (!result.success) {
        throw new Error('Signaling failed: ' + result.error);
      }
    } else {
      // Target: Set up data channel listener (will receive from initiator)
      peerConnection.ondatachannel = (event) => {
        console.log('[RemoteSession] Target received data channel');
        dataChannel = event.channel;

        // FIX: Set ALL handlers immediately and atomically
        dataChannel.onopen = () => {
          console.log('[RemoteSession] Data channel opened');
        };

        dataChannel.onclose = () => {
          console.log('[RemoteSession] Data channel closed');
        };

        dataChannel.onerror = (error) => {
          console.error('[RemoteSession] Data channel error:', error);
        };

        dataChannel.onmessage = handleDataChannelMessage;

        // Check if already open
        if (dataChannel.readyState === 'open') {
          console.log('[RemoteSession] Channel already open on arrival');
        }
      };

      // Target waits for offer from initiator
      console.log('[RemoteSession] Target ready, waiting for offer from initiator');
    }

  } catch (error) {
    console.error('[RemoteSession] Failed to initialize connection:', error);
    showError('Failed to establish connection: ' + error.message);
    updateStatus('disconnected', 'Connection failed');
  }
}

// Setup screen capture for target device
async function setupScreenCapture() {
  try {
    console.log('[RemoteSession] Setting up screen capture for target');

    // Get screen sources from Electron's desktopCapturer
    const sources = await require('electron').desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 },
    });

    if (sources.length === 0) {
      throw new Error('No screen sources available');
    }

    // Use the first screen (primary display)
    const primarySource = sources[0];
    console.log('[RemoteSession] Capturing screen:', primarySource.name);

    // Get media stream from the screen source
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: primarySource.id,
          minWidth: 1280,
          maxWidth: 3840,
          minHeight: 720,
          maxHeight: 2160,
          minFrameRate: 15,
          maxFrameRate: 60,
        },
      },
    });

    console.log('[RemoteSession] Got screen stream:', stream.id);

    // Add video track to peer connection
    stream.getVideoTracks().forEach((track) => {
      console.log('[RemoteSession] Adding video track:', track.label);
      peerConnection.addTrack(track, stream);
    });

    console.log('[RemoteSession] Screen capture setup complete');
  } catch (error) {
    console.error('[RemoteSession] Failed to setup screen capture:', error);
    showError('Failed to capture screen: ' + error.message);
    throw error;
  }
}

// Handle incoming signaling messages
async function handleSignalingMessage(event, message) {
  console.log('[RemoteSession] Received signaling message:', Object.keys(message));

  try {
    // FIX: Handle ICE candidates separately - queue if remote description not set
    if (message.iceCandidate) {
      if (!remoteDescriptionSet) {
        pendingIceCandidates.push(message.iceCandidate);
        console.log('[RemoteSession] Queued ICE candidate (remote desc not set yet)');
        return;
      }
      await peerConnection.addIceCandidate(new RTCIceCandidate(message.iceCandidate));
      console.log('[RemoteSession] Added ICE candidate');
      return;
    }

    if (message.offer) {
      // Target: Receive offer and create answer
      console.log('[RemoteSession] Target received offer, creating answer');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
      remoteDescriptionSet = true;

      // FIX: Drain queued ICE candidates
      for (const ice of pendingIceCandidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
        console.log('[RemoteSession] Added queued ICE candidate');
      }
      pendingIceCandidates = [];

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log('[RemoteSession] Target sending answer');
      // FIX: Use invoke instead of send for error handling
      const result = await ipcRenderer.invoke('remote-signaling', {
        sessionId,
        answer: {
          sdp: answer.sdp,
          type: answer.type,
        },
      });

      if (!result.success) {
        throw new Error('Signaling failed: ' + result.error);
      }
    } else if (message.answer) {
      // Initiator: Receive answer
      console.log('[RemoteSession] Initiator received answer');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
      remoteDescriptionSet = true;

      // FIX: Drain queued ICE candidates
      for (const ice of pendingIceCandidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
        console.log('[RemoteSession] Added queued ICE candidate');
      }
      pendingIceCandidates = [];

      console.log('[RemoteSession] Set remote description (answer)');
    }
  } catch (error) {
    console.error('[RemoteSession] Error handling signaling message:', error);
    showError('Signaling error: ' + error.message);
  }
}

// Setup input capture (mouse and keyboard)
function setupInputCapture() {
  const video = document.getElementById('remoteVideo');

  // Mouse events
  video.addEventListener('mousemove', (e) => {
    if (!isConnected || !dataChannel || dataChannel.readyState !== 'open') return;

    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    sendInputEvent({
      type: 'mouse',
      event: 'move',
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      timestamp: Date.now(),
    });
  });

  video.addEventListener('mousedown', (e) => {
    if (!isConnected || !dataChannel || dataChannel.readyState !== 'open') return;
    e.preventDefault();

    const button = ['left', 'middle', 'right'][e.button];
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    sendInputEvent({
      type: 'mouse',
      event: 'down',
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      button,
      timestamp: Date.now(),
    });
  });

  video.addEventListener('mouseup', (e) => {
    if (!isConnected || !dataChannel || dataChannel.readyState !== 'open') return;
    e.preventDefault();

    const button = ['left', 'middle', 'right'][e.button];
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    sendInputEvent({
      type: 'mouse',
      event: 'up',
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      button,
      timestamp: Date.now(),
    });
  });

  video.addEventListener('wheel', (e) => {
    if (!isConnected || !dataChannel || dataChannel.readyState !== 'open') return;
    e.preventDefault();

    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    sendInputEvent({
      type: 'mouse',
      event: 'scroll',
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      timestamp: Date.now(),
    });
  });

  // Keyboard events
  document.addEventListener('keydown', (e) => {
    if (!isConnected || !dataChannel || dataChannel.readyState !== 'open') return;
    e.preventDefault();

    sendInputEvent({
      type: 'keyboard',
      event: 'down',
      key: e.key,
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
      timestamp: Date.now(),
    });
  });

  document.addEventListener('keyup', (e) => {
    if (!isConnected || !dataChannel || dataChannel.readyState !== 'open') return;
    e.preventDefault();

    sendInputEvent({
      type: 'keyboard',
      event: 'up',
      key: e.key,
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
      timestamp: Date.now(),
    });
  });
}

// Handle data channel messages (for target - receives input events)
function handleDataChannelMessage(event) {
  try {
    const inputEvent = JSON.parse(event.data);
    console.log('[RemoteSession] Received input event:', inputEvent.type, inputEvent.event);

    // Forward to main process to inject into the system
    ipcRenderer.send('remote-send-input', sessionId, inputEvent.type, inputEvent);
  } catch (error) {
    console.error('[RemoteSession] Failed to handle data channel message:', error);
  }
}

// Send input event via data channel (for initiator)
function sendInputEvent(event) {
  if (!dataChannel || dataChannel.readyState !== 'open') {
    return;
  }

  try {
    dataChannel.send(JSON.stringify(event));
  } catch (error) {
    console.error('[RemoteSession] Failed to send input event:', error);
  }
}

// Toolbar functions
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function toggleQualityPanel() {
  const panel = document.getElementById('qualityPanel');
  panel.classList.toggle('visible');
}

function toggleStats() {
  const panel = document.getElementById('statsPanel');
  panel.classList.toggle('visible');
}

function changeQuality(quality) {
  console.log('[RemoteSession] Changing quality to:', quality);
  // TODO: Send quality change request to remote device
  ipcRenderer.send('remote-quality-change', { sessionId, quality });
  toggleQualityPanel();
}

function sendCtrlAltDel() {
  if (!isConnected) return;

  sendInputEvent({
    type: 'special_key',
    combination: 'ctrl-alt-del',
    timestamp: Date.now(),
  });
}

function toggleClipboard() {
  const checkbox = document.getElementById('clipboardSync');
  console.log('[RemoteSession] Clipboard sync:', checkbox.checked);
  // TODO: Enable/disable clipboard sync
  ipcRenderer.send('remote-clipboard-sync', { sessionId, enabled: checkbox.checked });
}

async function disconnectSession() {
  if (!confirm('Are you sure you want to disconnect?')) {
    return;
  }

  // FIX: Prevent double cleanup
  if (isCleaningUp) return;
  isCleaningUp = true;

  updateStatus('disconnected', 'Disconnecting...');

  // Cleanup connections
  cleanup();

  // End session via IPC
  try {
    await ipcRenderer.invoke('remote-end-session', sessionId);
  } catch (error) {
    console.error('[RemoteSession] Failed to end session:', error);
  }

  // Close window
  window.close();
}

// UI helper functions
function updateStatus(state, text) {
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  dot.className = 'status-dot ' + state;
  statusText.textContent = text;
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.add('hidden');
}

function showError(message) {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = message;
  errorElement.classList.add('visible');
}

// Connection stats monitoring
function startStatsMonitoring() {
  setInterval(async () => {
    if (!peerConnection || !isConnected) return;

    try {
      const stats = await peerConnection.getStats();
      let latency = 0;
      let bitrate = 0;
      let fps = 0;
      let resolution = '';
      let packetsLost = 0;
      let packetsReceived = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          bitrate = Math.round((report.bytesReceived * 8) / 1000); // kbps
          fps = report.framesPerSecond || 0;
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 0;
        }

        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : 0;
        }

        if (report.type === 'track' && report.kind === 'video') {
          resolution = `${report.frameWidth}x${report.frameHeight}`;
        }
      });

      // Update stats display
      document.getElementById('statLatency').textContent = latency + ' ms';
      document.getElementById('statBitrate').textContent = Math.round(bitrate / 1000) + ' Mbps';
      document.getElementById('statFps').textContent = fps + ' fps';
      document.getElementById('statResolution').textContent = resolution || '--';
      const packetLoss = packetsReceived > 0 ? (packetsLost / packetsReceived * 100).toFixed(2) : '0.00';
      document.getElementById('statPacketLoss').textContent = packetLoss + ' %';
    } catch (error) {
      console.error('[RemoteSession] Failed to get stats:', error);
    }
  }, 1000);
}

// FIX: Prevent double cleanup
let isCleaningUp = false;

// Cleanup function
function cleanup() {
  if (dataChannel && dataChannel.readyState !== 'closed') {
    dataChannel.close();
  }
  if (peerConnection && peerConnection.connectionState !== 'closed') {
    peerConnection.close();
  }
  const video = document.getElementById('remoteVideo');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
}

// Handle window close
window.addEventListener('beforeunload', () => {
  if (isCleaningUp) return;
  isCleaningUp = true;

  cleanup();
  ipcRenderer.removeAllListeners('remote-signaling-message');
});
