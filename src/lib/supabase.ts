/**
 * Supabase client utilities for Bombay Silvers Dealer Terminal.
 *
 * TWO clients are exported:
 *
 * 1. `supabase`  — browser-safe anon client. Use in React components and
 *    TanStack Query hooks. Subject to Row Level Security.
 *
 * 2. `createAdminClient` — service-role client. Use ONLY in server functions
 *    (TanStack Start loaders/actions, API routes). NEVER import this in
 *    client-side component code. Bypasses RLS — treat like a DB root key.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// ---------------------------------------------------------------------------
// Environment validation
// TanStack Start (SSR): import.meta.env works for VITE_* vars on both client
// and server. process.env is a fallback for the same secrets (server only).
// ---------------------------------------------------------------------------
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined);

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (typeof process !== "undefined" ? process.env.SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Replit Secrets."
  );
}

// ---------------------------------------------------------------------------
// Node.js < 22 WebSocket fix (SSR only)
//
// @supabase/realtime-js requires a WebSocket constructor. Node.js 20 does not
// ship one natively. The `ws` package (already in package.json) provides it.
//
// `import.meta.env.SSR` is a build-time constant in Vite:
//   - SSR build  → true  → this branch is included; `ws` is loaded
//   - Browser build → false → entire block is dead-code-eliminated by Vite;
//     `ws` is never bundled into the client.
// ---------------------------------------------------------------------------
let wsTransport: typeof WebSocket | undefined;
if (import.meta.env.SSR) {
  const { default: ws } = await import("ws");
  wsTransport = ws as unknown as typeof WebSocket;
}

// ---------------------------------------------------------------------------
// Browser-safe anon client (RLS enforced)
// ---------------------------------------------------------------------------
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  ...(wsTransport && { realtime: { transport: wsTransport } }),
});

// ---------------------------------------------------------------------------
// Server-side admin client (RLS bypassed via service role)
// Only instantiate on the server. Never expose service role key to the browser.
// ---------------------------------------------------------------------------
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "This client must only be used in server-side code."
    );
  }
  return createClient<Database>(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(wsTransport && { realtime: { transport: wsTransport } }),
  });
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------
export type SupabaseClient = typeof supabase;
