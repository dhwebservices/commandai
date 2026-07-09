import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS by design. Only ever instantiated in
 * this backend process (api-gateway). Never send this key to a browser or
 * log it. See AUTH_DESIGN.md.
 */
export function createSupabaseAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Anon-scoped client — used only for signInWithPassword, which is safe to
 * do with the anon key since Supabase Auth itself enforces the password
 * check server-side.
 */
export function createSupabaseAnonClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
