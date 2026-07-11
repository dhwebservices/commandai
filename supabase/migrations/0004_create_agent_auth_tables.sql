-- Agent enrollment tokens (short-lived, single-use, exchanged for long-lived credentials)
CREATE TABLE agent_enrollment_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Token secret (bcrypt hash, compared on exchange)
  token_hash TEXT NOT NULL,
  -- Single-use: set to true after successful exchange
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure tokens expire within reasonable bounds (max 24 hours)
  CONSTRAINT enrollment_token_expiry_bounds CHECK (
    expires_at > created_at AND
    expires_at <= created_at + INTERVAL '24 hours'
  )
);

CREATE INDEX idx_agent_enrollment_tokens_tenant ON agent_enrollment_tokens(tenant_id);
CREATE INDEX idx_agent_enrollment_tokens_expires ON agent_enrollment_tokens(expires_at) WHERE NOT used;

-- Agent credentials (long-lived, rotated periodically, tied to client cert)
CREATE TABLE agent_credentials (
  agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Client certificate details (PEM-encoded public cert, used for mTLS verification)
  cert_fingerprint TEXT NOT NULL UNIQUE,
  cert_subject TEXT NOT NULL,
  cert_expires_at TIMESTAMPTZ NOT NULL,
  -- Rotation schedule
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotates_at TIMESTAMPTZ NOT NULL,
  -- Revocation (agent removed, credential compromised, etc.)
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure rotation happens before cert expiry
  CONSTRAINT credential_rotation_before_expiry CHECK (
    rotates_at < cert_expires_at
  ),
  -- Revocation timestamp must be set if revoked
  CONSTRAINT credential_revoked_timestamp CHECK (
    (revoked = false) OR (revoked_at IS NOT NULL)
  )
);

CREATE INDEX idx_agent_credentials_tenant ON agent_credentials(tenant_id);
CREATE INDEX idx_agent_credentials_fingerprint ON agent_credentials(cert_fingerprint) WHERE NOT revoked;
CREATE INDEX idx_agent_credentials_rotation ON agent_credentials(rotates_at) WHERE NOT revoked;

-- RLS policies
ALTER TABLE agent_enrollment_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables (tenant admins generate tokens via API, never direct DB access)
CREATE POLICY agent_enrollment_tokens_service_only ON agent_enrollment_tokens
  FOR ALL USING (false);

CREATE POLICY agent_credentials_service_only ON agent_credentials
  FOR ALL USING (false);
