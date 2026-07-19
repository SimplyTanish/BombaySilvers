/**
 * Apply all Supabase migrations via the Supabase Management API over HTTPS.
 *
 * Replit's outbound network blocks port 5432, so `scripts/apply-migrations.mjs`
 * (direct Postgres connection) cannot run here. This script instead uses the
 * Management API's SQL execution endpoint, which runs over standard HTTPS (443):
 *
 *   POST https://api.supabase.com/v1/projects/{ref}/database/query
 *   Authorization: Bearer <SUPABASE_ACCESS_TOKEN>   (personal access token)
 *   { "query": "<sql>" }
 *
 * Each migration file is sent as a single query wrapped in BEGIN/COMMIT so a
 * mid-file failure rolls back cleanly rather than leaving partial state.
 *
 * Run: node scripts/apply-migrations-mgmt-api.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL; // https://<ref>.supabase.co

if (!accessToken || !supabaseUrl) {
  console.error("❌  Missing SUPABASE_ACCESS_TOKEN or SUPABASE_URL");
  process.exit(1);
}

const ref = supabaseUrl.replace(/^https?:\/\//, "").replace(/\.supabase\.co\/?$/, "");
const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;

const MIGRATIONS = [
  "supabase/migrations/20260707000001_initial_schema.sql",
  "supabase/migrations/20260707000002_rls_policies.sql",
  "supabase/migrations/20260707000003_integrity_triggers.sql",
  "supabase/migrations/20260707000004_multi_currency.sql",
];

async function runQuery(sql) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!res.ok) {
    const message =
      (body && (body.message || body.error || body.msg)) || text || res.statusText;
    throw new Error(`HTTP ${res.status}: ${message}`);
  }

  return body;
}

async function applyMigration(filePath) {
  const absPath = resolve(root, filePath);
  const sql = readFileSync(absPath, "utf-8");
  console.log(`\n📄  Applying ${filePath} …`);

  const wrapped = `BEGIN;\n${sql}\nCOMMIT;`;
  await runQuery(wrapped);
  console.log(`✅  Applied ${filePath}`);
}

async function main() {
  console.log(`🔗  Project ref: ${ref}`);
  console.log(`🔗  Endpoint: ${endpoint}`);

  for (const file of MIGRATIONS) {
    await applyMigration(file);
  }

  console.log("\n🎉  All migrations applied successfully.");
}

main().catch((err) => {
  console.error("\n❌  Migration failed:", err.message);
  process.exit(1);
});
