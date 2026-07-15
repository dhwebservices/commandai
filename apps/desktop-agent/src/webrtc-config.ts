/**
 * WebRTC Configuration for Remote Sessions
 * Defines STUN/TURN servers for NAT traversal
 */

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  iceCandidatePoolSize?: number;
}

/**
 * Get WebRTC configuration with STUN/TURN servers
 */
export function getWebRTCConfig(): WebRTCConfig {
  const config: WebRTCConfig = {
    // ICE servers for NAT traversal
    iceServers: [
      // Google's public STUN servers
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302',
        ],
      },
    ],
    // Generate more ICE candidates for better connectivity
    iceCandidatePoolSize: 10,
  };

  // Add TURN server if configured (for relay when direct connection fails)
  const turnServer = process.env.TURN_SERVER_URL;
  const turnUsername = process.env.TURN_USERNAME;
  const turnPassword = process.env.TURN_PASSWORD;

  if (turnServer && turnUsername && turnPassword) {
    config.iceServers.push({
      urls: turnServer,
      username: turnUsername,
      credential: turnPassword,
    });
    console.log('[WebRTC] TURN server configured:', turnServer);
  } else {
    console.log('[WebRTC] No TURN server configured - will attempt direct connection only');
  }

  return config;
}

/**
 * Connection quality metrics
 */
export interface ConnectionQuality {
  latency_ms: number;
  packet_loss: number;
  bitrate_kbps: number;
  connection_type: 'direct' | 'relayed';
}

/**
 * Monitor WebRTC connection quality
 */
export async function monitorConnectionQuality(
  peerConnection: RTCPeerConnection
): Promise<ConnectionQuality | null> {
  try {
    const stats = await peerConnection.getStats();
    let latency = 0;
    let packetLoss = 0;
    let bitrate = 0;
    let connectionType: 'direct' | 'relayed' = 'direct';

    stats.forEach((report) => {
      // Look for candidate-pair stats (selected pair shows actual connection)
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        // Check if using relay (TURN)
        if (report.localCandidateId) {
          const localCandidate = stats.get(report.localCandidateId);
          if (localCandidate && localCandidate.candidateType === 'relay') {
            connectionType = 'relayed';
          }
        }

        // Round-trip time (latency)
        if (report.currentRoundTripTime) {
          latency = Math.round(report.currentRoundTripTime * 1000); // Convert to ms
        }
      }

      // Look for inbound-rtp stats (packet loss, bitrate)
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        if (report.packetsLost && report.packetsReceived) {
          packetLoss = report.packetsLost / (report.packetsLost + report.packetsReceived);
        }
        if (report.bytesReceived && report.timestamp) {
          // Approximate bitrate (this is a simplified calculation)
          bitrate = Math.round((report.bytesReceived * 8) / 1000); // kbps
        }
      }
    });

    return {
      latency_ms: latency,
      packet_loss: Math.round(packetLoss * 10000) / 100, // Convert to percentage
      bitrate_kbps: bitrate,
      connection_type: connectionType,
    };
  } catch (error) {
    console.error('[WebRTC] Failed to get connection quality:', error);
    return null;
  }
}
