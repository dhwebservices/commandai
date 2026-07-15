-- Enhance File Transfers Table
-- Add transfer_id to link database records with in-memory transfer state

-- Add transfer_id column (unique identifier used by FileTransferManager)
ALTER TABLE file_transfers
ADD COLUMN transfer_id TEXT UNIQUE;

-- Add index for fast lookup by transfer_id
CREATE INDEX idx_file_transfers_transfer_id ON file_transfers(transfer_id);

-- Add modified_time column to track source file timestamp
ALTER TABLE file_transfers
ADD COLUMN modified_time TIMESTAMPTZ;

-- Add chunk tracking fields for resume support
ALTER TABLE file_transfers
ADD COLUMN total_chunks INTEGER,
ADD COLUMN chunks_received INTEGER DEFAULT 0,
ADD COLUMN chunk_size INTEGER;

-- Add index for querying active transfers
CREATE INDEX idx_file_transfers_active ON file_transfers(status, session_id)
  WHERE status IN ('pending', 'transferring');

-- Update RLS policies to allow INSERT for authenticated users
CREATE POLICY file_transfers_insert ON file_transfers
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Allow UPDATE for users in the same tenant
CREATE POLICY file_transfers_update ON file_transfers
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Comments for documentation
COMMENT ON COLUMN file_transfers.transfer_id IS 'Unique transfer identifier from FileTransferManager protocol';
COMMENT ON COLUMN file_transfers.chunks_received IS 'Number of chunks successfully received (for resume tracking)';
COMMENT ON COLUMN file_transfers.total_chunks IS 'Total number of chunks in transfer';
COMMENT ON COLUMN file_transfers.chunk_size IS 'Size of each chunk in bytes';
