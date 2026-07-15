-- Remote Support Tables Migration
-- Creates tables for device registry, remote sessions, recordings, file transfers, and support queue

-- devices table: Registry of all enrolled devices per tenant
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agent_credentials(agent_id) ON DELETE CASCADE,

  -- Device identification
  hostname TEXT NOT NULL,
  device_name TEXT, -- User-friendly name
  os_type TEXT NOT NULL CHECK (os_type IN ('macos', 'windows', 'linux')),
  os_version TEXT NOT NULL,

  -- Network information
  primary_ip TEXT,
  last_known_ip TEXT,

  -- Capabilities (what the device can do)
  capabilities JSONB NOT NULL DEFAULT '{}', -- { screenCapture: true, audioCapture: true, remoteControl: true, ... }

  -- Presence tracking
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'in_session', 'busy')),
  last_seen_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,

  -- Metadata
  device_metadata JSONB DEFAULT '{}', -- { cpu: "...", memory: "...", screens: [...] }

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(agent_id)
);

CREATE INDEX idx_devices_tenant_id ON devices(tenant_id);
CREATE INDEX idx_devices_status ON devices(status) WHERE status = 'online';
CREATE INDEX idx_devices_hostname ON devices(hostname);

-- remote_sessions table: Complete history of all remote sessions
CREATE TABLE remote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Session participants
  target_device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  initiator_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_controller_user_id UUID REFERENCES profiles(id), -- NULL if view-only

  -- Session configuration
  session_type TEXT NOT NULL CHECK (session_type IN ('interactive', 'view_only', 'unattended', 'file_transfer_only')),
  permissions JSONB NOT NULL DEFAULT '{}', -- { control: true, clipboard: true, fileTransfer: true, audio: true }

  -- Session state
  state TEXT NOT NULL CHECK (state IN ('requested', 'pending_approval', 'connecting', 'connected', 'disconnected', 'completed', 'failed', 'cancelled')),
  state_history JSONB NOT NULL DEFAULT '[]', -- Array of { state, timestamp, actor }

  -- Connection details
  connection_type TEXT CHECK (connection_type IN ('direct', 'relayed')), -- NULL until connected
  peer_connection_id TEXT, -- WebRTC connection ID
  signaling_metadata JSONB, -- ICE candidates, SDP offers, etc.

  -- Quality metrics
  quality_metrics JSONB, -- { latency_ms: 50, packet_loss: 0.01, bitrate_kbps: 2000 }

  -- Recording
  is_recorded BOOLEAN NOT NULL DEFAULT false,
  recording_id UUID, -- Foreign key to session_recordings

  -- Timing
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Session metadata
  disconnect_reason TEXT,
  session_notes TEXT, -- Technician notes

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_remote_sessions_tenant_id ON remote_sessions(tenant_id);
CREATE INDEX idx_remote_sessions_target_device ON remote_sessions(target_device_id);
CREATE INDEX idx_remote_sessions_initiator ON remote_sessions(initiator_user_id);
CREATE INDEX idx_remote_sessions_state ON remote_sessions(state);
CREATE INDEX idx_remote_sessions_active ON remote_sessions(state) WHERE state IN ('connecting', 'connected');

-- session_events table: Timeline of everything that happens during a session
CREATE TABLE session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES remote_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'connected', 'control_granted', 'file_transferred', 'command_executed', 'note_added', etc.
  event_data JSONB NOT NULL DEFAULT '{}', -- Type-specific data
  actor_id UUID REFERENCES profiles(id), -- Who caused this event (NULL for system events)

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_events_session_id ON session_events(session_id);
CREATE INDEX idx_session_events_occurred_at ON session_events(occurred_at);

-- session_recordings table: Metadata for recorded sessions
CREATE TABLE session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES remote_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Recording metadata
  storage_path TEXT NOT NULL, -- Path in blob storage (R2/S3)
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  codec TEXT, -- 'h264', 'vp8', etc.
  resolution TEXT, -- '1920x1080'

  -- Recording state
  status TEXT NOT NULL CHECK (status IN ('recording', 'processing', 'available', 'failed', 'deleted')),

  -- Timeline index (for seeking)
  timeline_index JSONB, -- Array of { timestamp, keyframe_offset }

  -- Access control
  retention_until TIMESTAMPTZ, -- Automatic deletion date per policy

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_recordings_session_id ON session_recordings(session_id);
CREATE INDEX idx_session_recordings_status ON session_recordings(status);

-- file_transfers table: Track file uploads/downloads during sessions
CREATE TABLE file_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES remote_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Transfer details
  direction TEXT NOT NULL CHECK (direction IN ('upload', 'download')), -- From technician perspective
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_hash TEXT, -- SHA-256 for integrity
  mime_type TEXT,

  -- Transfer state
  status TEXT NOT NULL CHECK (status IN ('pending', 'transferring', 'completed', 'failed', 'cancelled')),
  bytes_transferred BIGINT DEFAULT 0,

  -- Storage (if cloud-mediated)
  storage_path TEXT, -- Temporary storage path

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_file_transfers_session_id ON file_transfers(session_id);
CREATE INDEX idx_file_transfers_status ON file_transfers(status);

-- support_queue table: Incoming support requests for business tenants
CREATE TABLE support_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Request details
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES profiles(id), -- Device user requesting help
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Assignment
  assigned_technician_id UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,

  -- Session linkage
  session_id UUID REFERENCES remote_sessions(id), -- Created when technician accepts

  -- State
  status TEXT NOT NULL CHECK (status IN ('waiting', 'assigned', 'in_progress', 'completed', 'cancelled')),
  resolution TEXT, -- Resolution notes

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- SLA tracking
  wait_time_seconds INTEGER, -- Time waiting for technician
  total_duration_seconds INTEGER -- Total time to resolution
);

CREATE INDEX idx_support_queue_tenant_id ON support_queue(tenant_id);
CREATE INDEX idx_support_queue_status ON support_queue(status);
CREATE INDEX idx_support_queue_device_id ON support_queue(device_id);
CREATE INDEX idx_support_queue_assigned_technician ON support_queue(assigned_technician_id);

-- RLS policies for all new tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_queue ENABLE ROW LEVEL SECURITY;

-- Devices: Users can see devices in their tenant
CREATE POLICY devices_tenant_isolation ON devices
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Remote sessions: Users can see sessions they participated in or sessions on their tenant's devices
CREATE POLICY remote_sessions_tenant_isolation ON remote_sessions
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Session events: Same as remote_sessions
CREATE POLICY session_events_tenant_isolation ON session_events
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Session recordings: Only accessible to authorized users (technicians, admins)
CREATE POLICY session_recordings_tenant_isolation ON session_recordings
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- File transfers: Same as remote_sessions
CREATE POLICY file_transfers_tenant_isolation ON file_transfers
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Support queue: Same as remote_sessions
CREATE POLICY support_queue_tenant_isolation ON support_queue
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );
