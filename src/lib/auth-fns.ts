/**
 * Server functions for authentication flows.
 * These run on the server so secrets never reach the browser.
 */

import { createServerFn } from "@tanstack/react-start";
import { createAdminClient } from "@/lib/supabase";

/**
 * Look up a dealer's email by their registered phone number.
 * Returns { found: false } if the phone isn't in the dealers table OR if the
 * table doesn't exist yet (migrations not applied) — callers show a "register"
 * message in both cases.
 */
export const lookupEmailByPhone = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    const d = raw as { phone?: string };
    if (typeof d?.phone !== "string" || !d.phone) throw new Error("phone required");
    return { phone: d.phone };
  })
  .handler(async ({ data }): Promise<{ found: false } | { found: true; email: string }> => {
    try {
      const admin = createAdminClient();
      const { data: dealer, error } = await admin
        .from("dealers")
        .select("email")
        .eq("phone", data.phone)
        .maybeSingle();
      if (error || !dealer) return { found: false };
      return { found: true, email: dealer.email as string };
    } catch {
      return { found: false };
    }
  });

/**
 * Persist a dealer application profile after OTP verification.
 * Fails gracefully if the schema hasn't been migrated yet.
 */
export const saveDealerProfile = createServerFn({ method: "POST" })
  .validator((raw: unknown) => raw as Record<string, unknown>)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const admin = createAdminClient();
      const { error } = await admin
        .from("dealers")
        .upsert(data, { onConflict: "phone" });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
