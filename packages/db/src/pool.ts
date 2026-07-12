import { Pool, type PoolClient } from "pg";
import { z } from "zod";
import { BaseEnvSchema, loadConfig } from "@comandr/config";

const DbEnvSchema = BaseEnvSchema.extend({
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
});

export function createPool(): Pool {
  const env = loadConfig(DbEnvSchema); // fails fast on invalid/missing config
  return new Pool({
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    database: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
  });
}

/**
 * Runs `fn` on a client with the Postgres session variable
 * `app.tenant_id` set for the duration of the transaction, which the RLS
 * policies on tenant-scoped tables key off. This is the only sanctioned
 * way tenant-scoped queries should be issued — see
 * infra/db/migrations/0001_create_tenants.sql for the policy definitions.
 * Application-layer `WHERE tenant_id = ...` filtering is defense in depth,
 * not a substitute for this.
 */
export async function withTenantContext<T>(
  pool: Pool,
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
