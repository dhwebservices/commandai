import { AuditLog, SupabaseAuditLog, type AuditWriter, type AuditReader } from "@comandr/audit-service";
import { createSupabaseAdminClient } from "../auth/supabase-admin.client";
import { loadApiGatewayConfig } from "../../config";

export const AUDIT_LOG = "AUDIT_LOG";
export type AuditLogPort = AuditWriter & AuditReader;

/** Production provider: real persistence in the Supabase project (ADR-009). */
export function auditLogFactory(): AuditLogPort {
  const config = loadApiGatewayConfig();
  const admin = createSupabaseAdminClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  return new SupabaseAuditLog(admin);
}

/** Test/local-only fallback — no network required. */
export function inMemoryAuditLog(): AuditLogPort {
  return new AuditLog();
}
