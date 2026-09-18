/**
 * Apply all Supabase migrations to the database.
 * Run: node scripts/apply-migrations.mjs
 *
 * Each migration file is wrapped in an explicit transaction so a mid-file
 * failure rolls back cleanly rather than leaving partial state.
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const { Client } = pg;

const rawPassword = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.SUPABASE_URL; // https://<ref>.supabase.co

if (!rawPassword || !supabaseUrl) {
  console.error("❌  Missing SUPABASE_DB_PASSWORD or SUPABASE_URL");
  process.exit(1);
}

// URL-encode the password so special characters (!, @, #, etc.) don't break URI parsing.
const encodedPassword = encodeURIComponent(rawPassword);

// Derive project ref from the Supabase API URL.
const ref = supabaseUrl.replace(/^https?:\/\//, "").replace(".supabase.co", "");

// Direct (non-pooled) connection required for DDL/migrations.
// sslmode=require keeps certificate verification enabled.
const connectionString = `postgresql://postgres:${encodedPassword}@db.${ref}.supabase.co:5432/postgres?sslmode=require`;

const MIGRATIONS = [
  "supabase/migrations/20260707000001_initial_schema.sql",
  "supabase/migrations/20260707000002_rls_policies.sql",
  "supabase/migrations/20260707000003_integrity_triggers.sql",
];

/**
 * Apply a single migration file inside an explicit transaction.
 * If any statement fails, the transaction is rolled back and the error rethrown.
 */
async function applyMigration(client, filePath) {
  const absPath = resolve(root, filePath);
  const sql = readFileSync(absPath, "utf-8");
  console.log(`\n📄  Applying ${filePath} …`);

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`  ✅  Done`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`  ❌  Error (rolled back): ${err.message}`);
    throw err;
  }
}

async function main() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`🔌  Connected to Supabase PostgreSQL (project: ${ref})\n`);

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
