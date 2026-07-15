# TURN Server Setup for Remote Desktop

## Overview

TURN (Traversal Using Relays around NAT) servers are needed when direct peer-to-peer WebRTC connections fail due to restrictive NAT or firewalls. The TURN server acts as a relay.

## Quick Start with Docker

### 1. Using Docker Compose (Recommended for Development)

Add to your `docker-compose.yml`:

```yaml
services:
  coturn:
    image: coturn/coturn:latest
    ports:
      - "3478:3478/udp"  # STUN/TURN
      - "3478:3478/tcp"  # STUN/TURN over TCP
      - "49152-65535:49152-65535/udp"  # TURN relay ports
    environment:
      - REALM=comandr.io
      - MIN_PORT=49152
      - MAX_PORT=65535
      - STATIC_AUTH_SECRET=${TURN_SECRET}
    volumes:
      - ./infra/coturn/turnserver.conf:/etc/coturn/turnserver.conf
    restart: unless-stopped
    network_mode: host  # Required for TURN to work properly
```

### 2. Create Configuration File

Create `infra/coturn/turnserver.conf`:

```conf
# TURN server configuration for Comandr

# Listening port for TURN
listening-port=3478

# Relay ports for media
min-port=49152
max-port=65535

# Realm (domain)
realm=comandr.io

# Enable fingerprinting
fingerprint

# Use long-term credentials
lt-cred-mech

# Static auth secret (shared with application)
static-auth-secret=${TURN_SECRET}

# Log level (3 = ERROR, 4 = WARNING, 5 = NOTICE, 6 = INFO)
log-level=5

# Disable TURN over TCP for better performance
no-tcp-relay

# Allow only specific subnets (optional, for security)
# allowed-peer-ip=10.0.0.0-10.255.255.255
# allowed-peer-ip=192.168.0.0-192.168.255.255

# Deny private IP relay (security)
no-loopback-peers
no-multicast-peers

# Enable Prometheus metrics (optional)
# prometheus
```

### 3. Generate TURN Credentials

The application will generate time-limited TURN credentials:

```typescript
import crypto from 'crypto';

function generateTurnCredentials(secret: string, username: string, ttl: number = 86400) {
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const turnUsername = `${timestamp}:${username}`;
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(turnUsername);
  const turnPassword = hmac.digest('base64');

  return {
    username: turnUsername,
    password: turnPassword,
    urls: 'turn:your-turn-server.com:3478'
  };
}
```

### 4. Environment Variables

Add to your `.env`:

```bash
# TURN Server Configuration
TURN_SERVER_URL=turn:your-server.com:3478
TURN_SECRET=your-static-auth-secret-here
```

## Production Deployment

### AWS EC2 / DigitalOcean

1. Launch a server with:
   - 2 CPUs
   - 4GB RAM
   - Ubuntu 22.04 LTS

2. Open firewall ports:
   - 3478 UDP/TCP (STUN/TURN)
   - 49152-65535 UDP (TURN relay)

3. Install coturn:

```bash
sudo apt update
sudo apt install coturn
```

4. Configure `/etc/turnserver.conf` (same as above)

5. Enable and start:

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

### Security Best Practices

1. **Use time-limited credentials** - Generate credentials with TTL
2. **Restrict allowed IPs** - Only allow connections from known subnets
3. **Enable TLS** - Use TURNS (TURN over TLS) in production
4. **Monitor usage** - Set up Prometheus metrics and alerting
5. **Rate limiting** - Prevent abuse by limiting connections per IP

### Testing TURN Server

Test using `turnutils_uclient` (included with coturn):

```bash
turnutils_uclient -v -u username -w password your-server.com
```

Or test from browser console:

```javascript
const pc = new RTCPeerConnection({
  iceServers: [{
    urls: 'turn:your-server.com:3478',
    username: 'username',
    credential: 'password'
  }]
});

pc.createDataChannel('test');
pc.createOffer().then(offer => pc.setLocalDescription(offer));

pc.onicecandidate = (e) => {
  if (e.candidate) {
    console.log('ICE candidate:', e.candidate.candidate);
  }
};
```

## Monitoring

### Metrics to Track

- Active TURN sessions
- Bandwidth usage (critical for cost)
- Failed connection attempts
- Average relay duration
- Geographic distribution of connections

### Prometheus Integration

If using Prometheus metrics in coturn:

```yaml
- job_name: 'coturn'
  static_configs:
    - targets: ['coturn:9641']
```

## Cost Optimization

1. **Prefer direct connections** - STUN should succeed most of the time
2. **Connection timeout** - Set aggressive timeouts to fall back to TURN
3. **Quality-based relay** - Only use TURN when connection quality is poor
4. **Regional TURN servers** - Deploy closer to users
5. **Bandwidth monitoring** - Alert on unusual usage

## Troubleshooting

### Connection fails with "ICE failed"

- Check firewall rules (UDP ports 49152-65535)
- Verify TURN credentials are valid
- Test with `turnutils_uclient`

### High bandwidth usage

- Check for relay loops
- Implement connection quality monitoring
- Add rate limiting

### TURN not being used

- Verify ICE candidates include relay type
- Check browser console for WebRTC errors
- Ensure STUN/TURN servers are reachable

## Alternative Providers

Instead of self-hosting, consider:

- **Twilio STUN/TURN** - Pay-as-you-go, reliable
- **Metered.ca** - Free tier available
- **Xirsys** - WebRTC infrastructure service

```typescript
// Example with Twilio
const iceServers = [{
  urls: 'stun:global.stun.twilio.com:3478'
}, {
  urls: 'turn:global.turn.twilio.com:3478',
  username: 'twilio-username',
  credential: 'twilio-credential'
}];
```
