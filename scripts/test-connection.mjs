/**
 * Supabase connection test script.
 * Run after applying migrations:
 *   node scripts/test-connection.mjs
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

async function main() {
  console.log("🔌  Connecting to Supabase:", url);

  // 1. Verify tables exist
  const tables = [
    "users", "firms", "dealers", "kyc_documents",
    "warehouses", "products", "inventory", "inventory_transactions",
    "orders", "order_items", "invoices", "ledger_entries",
    "referrals", "notifications", "sessions", "audit_logs",
  ];

  let allOk = true;
  for (const table of tables) {
    const { error } = await supabase.from(table).select("count").limit(0);
    if (error) {
      console.error(`  ❌  ${table}: ${error.message}`);
      allOk = false;
    } else {
      console.log(`  ✅  ${table}`);
    }
  }

  // 2. Verify helper functions exist
  const functions = [
    "get_my_role", "get_my_dealer_id",
    "generate_order_number", "generate_invoice_number",
    "generate_referral_code",
  ];
  for (const fn of functions) {
    const { error } = await supabase.rpc(fn);
    // Expected to return null/error for auth functions (no session), but the
    // function should exist (error code won't be PGRST202 "function not found").
    if (error?.code === "PGRST202") {
      console.error(`  ❌  function ${fn}(): not found`);
      allOk = false;
    } else {
      console.log(`  ✅  function ${fn}()`);
    }
  }

  if (allOk) {
    console.log("\n✅  All tables and functions verified. Schema is applied correctly.");
  } else {
    console.log("\n⚠️  Some checks failed. Apply all three migrations and retry.");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
