/**
 * Apply all Supabase migrations to the database.
 * Run: node scripts/apply-migrations.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const { Client } = pg;

const password = process.env.SUPABASE_DB_PASSWORD;
const url = process.env.SUPABASE_URL; // https://ifipekomyainduotbjqd.supabase.co

if (!password || !url) {
  console.error("❌  Missing SUPABASE_DB_PASSWORD or SUPABASE_URL");
  process.exit(1);
}

// Derive project ref from URL
const ref = url.replace("https://", "").replace(".supabase.co", "");
// Use the direct (non-pooled) connection — required for DDL/migrations.
const connectionString = `postgresql://postgres:${password}@db.${ref}.supabase.co:5432/postgres`;

const MIGRATIONS = [
  "supabase/migrations/20260707000001_initial_schema.sql",
  "supabase/migrations/20260707000002_rls_policies.sql",
  "supabase/migrations/20260707000003_integrity_triggers.sql",
];

async function applyMigration(client, filePath) {
  const absPath = resolve(root, filePath);
  const sql = readFileSync(absPath, "utf-8");
  console.log(`\n📄  Applying ${filePath} …`);
  try {
    await client.query(sql);
    console.log(`  ✅  Done`);
  } catch (err) {
    console.error(`  ❌  Error: ${err.message}`);
    throw err;
  }
}

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log("🔌  Connected to Supabase PostgreSQL\n");

    for (const migration of MIGRATIONS) {
      await applyMigration(client, migration);
    }

    console.log("\n✅  All migrations applied successfully.");
  } catch (err) {
    console.error("\n❌  Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
