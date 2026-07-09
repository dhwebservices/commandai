import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createPool } from "./pool";

/**
 * Deliberately plain: reads .sql files from infra/db/migrations in
 * lexicographic order, applies any not yet recorded in schema_migrations,
 * each inside its own transaction. No ORM, no magic — per
 * docs/standards/DESIGN_PRINCIPLES.md "explicit over magic". Every schema
 * change must go through this (Non-Negotiable #5) — no manual edits, in
 * any environment including local dev.
 */
const MIGRATIONS_DIR = join(__dirname, "../../../infra/db/migrations");

async function run() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const applied = new Set(
      (await client.query("SELECT filename FROM schema_migrations")).rows.map(
        (r: { filename: string }) => r.filename,
      ),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
      console.log(`Applying migration: ${file}`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }

    console.log("Migrations up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
