/**
 * Server functions for authentication flows.
 * These run on the server so secrets never reach the browser.
 */

/**
 * Demo preview mode: when no verified sending domain is configured yet, the
 * verification code is returned to the client and shown on-screen instead of
 * being emailed. Flip VITE_DEMO_MODE to false once real email sending is set up.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

import { createServerFn } from "@tanstack/react-start";
import type { Enums } from "@/lib/database.types";
import { cleanDigits, isValidEmail, isValidIndianMobile } from "@/lib/validate";

type BusinessType = Enums<"business_type">;
type MetalFocus = Enums<"metal_focus">;
import { createAdminClient } from "@/lib/supabase";

/**
 * Tiny in-memory rate limiter (per Worker instance).
 * Not a replacement for edge-level throttling, but it stops scripted abuse of
 * the server functions (OTP minting, phone/email enumeration).
 */
const rateLog: Record<string, number[]> = {};
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (rateLog[key] ??= []);
  while (hits.length > 0 && now - hits[0] > windowMs) hits.shift();
  if (hits.length >= limit) return true;
  hits.push(now);
  return false;
}

type UserLookupRow = {
  id: string;
  email: string | null;
  role: string;
};

type DealerLookupRow = {
  id: string;
};

type FirmLookupRow = {
  id: string;
};

type UserInsertRow = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: "dealer";
  is_active: boolean;
};

type FirmInsertRow = {
  firm_name: string;
  proprietor_name: string;
  business_type: BusinessType;
  years_in_business: number;
  primary_metal_focus: MetalFocus;
  monthly_turnover_range: string | null;
  city: string;
  state: string;
  warehouse_address: string | null;
  gstin: string | null;
  pan_number: string | null;
};

type DealerInsertRow = {
  user_id: string;
  firm_id: string;
  dealer_code: string;
  referral_code: string;
  status: "pending_kyc" | "under_review" | "active" | "suspended" | "rejected";
  tier: "bronze" | "silver" | "gold" | "platinum";
  credit_limit: number;
  current_balance: number;
};

type SingleRowResult = {
  data: { id: string } | null;
  error: Error | null;
};

type AdminQueryBuilderLike = {
  select(columns: string): AdminQueryBuilderLike;
  eq(column: string, value: unknown): AdminQueryBuilderLike;
  maybeSingle(): Promise<{ data: unknown; error: Error | null }>;
  insert(values: unknown): AdminQueryBuilderLike;
  upsert(values: unknown, options?: { onConflict?: string }): AdminQueryBuilderLike;
  single(): Promise<SingleRowResult>;
};

type AdminClientLike = {
  from(table: string): AdminQueryBuilderLike;
};

type DealerProfilePayload = {
  user_id: string;
  access_token: string;
  firm_name: string;
  contact_name: string;
  business_type: BusinessType;
  years_in_business: number;
  primary_metal_focus: MetalFocus;
  monthly_turnover_range: string | null;
  city: string;
  state: string;
  warehouse_address: string | null;
  gstin: string | null;
  pan_number: string | null;
  phone: string | null;
  email: string | null;
};

function normalizeBusinessType(value: unknown): BusinessType {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "proprietorship" ||
      normalized === "partnership" ||
      normalized === "private_limited" ||
      normalized === "public_limited" ||
      normalized === "llp" ||
      normalized === "trust"
    ) {
      return normalized as BusinessType;
    }
  }
  return "other";
}

function normalizeMetalFocus(value: unknown): MetalFocus {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "gold" || normalized === "silver" || normalized === "platinum") {
      return normalized as MetalFocus;
    }
  }
  return "mixed";
}

function makeCode(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

/**
 * Look up a dealer's email by their registered phone number.
 * Returns the email used for OTP login.
 */
export const lookupEmailByPhone = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    const d = raw as { phone?: string };

    if (typeof d?.phone !== "string" || !d.phone.trim()) {
      throw new Error("Phone number is required");
    }

    const digits = cleanDigits(d.phone);
    const number = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    if (!isValidIndianMobile(number)) {
      throw new Error("Enter a valid 10-digit mobile number.");
    }

    return {
      phone: `+91${number}`,
    };
  })
  .handler(async ({ data }): Promise<{ found: false } | { found: true; email: string }> => {
    // Guard against phone-number enumeration / OTP-trigger spam.
    if (rateLimited(`lookup:${data.phone}`, 10, 60_000)) {
      throw new Error("Too many attempts. Please try again shortly.");
    }
    if (rateLimited("lookup:global", 240, 60_000)) {
      throw new Error("Too many attempts. Please try again shortly.");
    }

    const admin = createAdminClient() as unknown as AdminClientLike;

    const { data: userData, error: userError } = await admin
      .from("users")
      .select("id, email, role")
      .eq("phone", data.phone)
      .eq("role", "dealer")
      .maybeSingle();

    const user = userData as UserLookupRow | null;

    if (userError || !user) {
      console.error("User lookup failed:", userError);
      return { found: false };
    }

    if (!user.email) {
      console.error("User lookup returned an empty email:", user.id);
      return { found: false };
    }

    const { data: dealerData, error: dealerError } = await admin
      .from("dealers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const dealer = dealerData as DealerLookupRow | null;

    if (dealerError || !dealer) {
      console.error("Dealer lookup failed:", dealerError);
      return { found: false };
    }

    return {
      found: true,
      email: user.email,
    };
  });

/**
 * Demo preview mode: creates the auth user (or refreshes an OTP for an
 * existing one) and returns the raw 6-digit code to the client so the whole
 * verification flow can be demoed without real email delivery. Only used when
 * DEMO_MODE is enabled — prod flow still goes through signInWithOtp → email.
 */
export const demoGetOtp = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    const d = raw as { flow?: "login" | "register"; email?: string };
    if (typeof d?.email !== "string" || !isValidEmail(d.email)) {
      throw new Error("A valid email address is required.");
    }
    return {
      flow: d.flow === "register" ? ("register" as const) : ("login" as const),
      email: d.email.trim().toLowerCase(),
    };
  })
  .handler(async ({ data }): Promise<{ otp: string } | { error: string }> => {
    // The resulting code is shown on-screen ONLY in demo builds. Outside demo
    // mode this endpoint must refuse — otherwise anyone could mint and read an
    // OTP for any account. The flag is replaced at build time on the server.
    if (!DEMO_MODE) {
      return { error: "Verification codes are sent by email in this environment." };
    }

    // Per-address throttle: max 3 minted codes per 10 minutes per email, and a
    // low global ceiling to blunt scripted password/OTP harvesting.
    if (rateLimited(`otp:${data.email}`, 3, 10 * 60_000)) {
      return { error: "Too many requests. Try again in a few minutes." };
    }
    if (rateLimited("otp:global", 60, 10 * 60_000)) {
      return { error: "Too many requests. Try again in a few minutes." };
    }

    const admin = createAdminClient() as {
      auth: {
        admin: {
          generateLink: (params: unknown) => Promise<{
            data?: { properties: { email_otp: string } };
            error?: { message: string } | null;
          }>;
        };
      };
    };

    const type = "magiclink";

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type,
      email: data.email,
    });

    if (linkError || !linkData?.properties?.email_otp) {
      console.error("demoGetOtp failed:", linkError?.message);
      return { error: "Couldn't start verification for this address." };
    }

    return { otp: linkData.properties.email_otp };
  });

export const saveDealerProfile = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    if (!raw || typeof raw !== "object") {
      throw new Error("Profile payload is required");
    }

    const d = raw as Record<string, unknown>;
    const userId = typeof d.user_id === "string" && d.user_id.trim() ? d.user_id.trim() : "";

    if (!userId) {
      throw new Error("Authenticated user id is required");
    }

    // The end-user's own Supabase access token. The caller must prove they ARE
    // this user before we write a dealer/firm row linked to that user id.
    const accessToken = typeof d.access_token === "string" ? d.access_token.trim() : "";
    if (!accessToken) {
      throw new Error("Session token is required. Please sign in again.");
    }

    const email =
      (typeof d.email === "string" && d.email.trim()) ||
      (typeof d.email_address === "string" && d.email_address.trim()) ||
      "";
    if (email && !isValidEmail(email)) {
      throw new Error("Enter a valid email address.");
    }

    const phone =
      (typeof d.phone === "string" && d.phone.trim()) ||
      (typeof d.mobile === "string" && d.mobile.trim()) ||
      "";
    if (phone && !isValidIndianMobile(phone)) {
      throw new Error("Enter a valid 10-digit mobile number.");
    }

    const firmName =
      (typeof d.firm_name === "string" && d.firm_name.trim()) ||
      (typeof d.firmName === "string" && d.firmName.trim()) ||
      "";

    const contactName =
      (typeof d.contact_name === "string" && d.contact_name.trim()) ||
      (typeof d.contactName === "string" && d.contactName.trim()) ||
      "";

    return {
      user_id: userId,
      access_token: accessToken,
      firm_name: firmName,
      contact_name: contactName,
      business_type: normalizeBusinessType(d.business_type ?? d.businessType),
      years_in_business: Number(
        typeof d.years_in_business === "number"
          ? d.years_in_business
          : typeof d.yearsInBusiness === "string"
            ? d.yearsInBusiness
            : 0,
      ),
      primary_metal_focus: normalizeMetalFocus(d.primary_metal_focus ?? d.primaryMetal),
      monthly_turnover_range:
        (typeof d.monthly_turnover === "string" && d.monthly_turnover.trim()) ||
        (typeof d.monthlyTurnover === "string" && d.monthlyTurnover.trim()) ||
        null,
      city: typeof d.city === "string" ? d.city.trim() : "",
      state: typeof d.state === "string" ? d.state.trim() : "",
      warehouse_address:
        typeof d.warehouse_address === "string" && d.warehouse_address.trim()
          ? d.warehouse_address.trim()
          : null,
      gstin: typeof d.gstin === "string" && d.gstin.trim() ? d.gstin.trim() : null,
      pan_number:
        typeof d.pan_number === "string" && d.pan_number.trim() ? d.pan_number.trim() : null,
      phone: phone || null,
      email: email || null,
    } satisfies DealerProfilePayload;
  })
  .handler(async ({ data }) => {
    const adminCore = createAdminClient() as unknown as AdminClientLike & {
      auth: {
        getUser: (
          jwt: string,
        ) => Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
      };
    };

    // Prove the caller actually owns the session for the user_id they claim.
    // Without this, anyone could POST an arbitrary user_id and take over /
    // overwrite that user's identity row (critical IDOR).
    const authRes = await adminCore.auth.getUser(data.access_token);
    const authenticatedId = authRes?.data?.user?.id;
    if (authRes?.error || !authenticatedId) {
      throw new Error("Session is invalid or expired. Please sign in again.");
    }
    if (authenticatedId !== data.user_id) {
      throw new Error("Session does not match this profile. Please sign in again.");
    }

    const admin = adminCore as unknown as AdminClientLike;

    const userPayload: UserInsertRow = {
      id: data.user_id,
      email: data.email,
      phone: data.phone,
      full_name: data.contact_name,
      role: "dealer",
      is_active: true,
    };

    // Re-verify the identity row can only be claimed once (by its owner).
    const { data: existingUser } = await admin
      .from("users")
      .select("id, email, phone, role")
      .eq("id", data.user_id)
      .maybeSingle();

    const existing = existingUser as UserLookupRow | null;
    if (
      existing &&
      ((existing.email != null && existing.email !== data.email) ||
        (existing.phone != null && existing.phone !== data.phone))
    ) {
      throw new Error("This account is already linked to different contact details.");
    }

    const upsertResult = (await admin.from("users").upsert(userPayload, {
      onConflict: "id",
    })) as unknown as { error: Error | null };
    const userError = upsertResult.error;

    if (userError) {
      throw userError;
    }

    const { data: existingFirmData, error: existingFirmError } = await admin
      .from("firms")
      .select("id")
      .eq("firm_name", data.firm_name)
      .eq("proprietor_name", data.contact_name)
      .eq("city", data.city)
      .eq("state", data.state)
      .maybeSingle();

    const existingFirm = existingFirmData as FirmLookupRow | null;

    if (existingFirmError) {
      throw existingFirmError;
    }

    let firmId: string;

    if (existingFirm?.id) {
      firmId = existingFirm.id;
    } else {
      const firmPayload: FirmInsertRow = {
        firm_name: data.firm_name,
        proprietor_name: data.contact_name,
        business_type: data.business_type,
        years_in_business: data.years_in_business,
        primary_metal_focus: data.primary_metal_focus,
        monthly_turnover_range: data.monthly_turnover_range,
        city: data.city,
        state: data.state,
        warehouse_address: data.warehouse_address,
        gstin: data.gstin,
        pan_number: data.pan_number,
      };

      const { data: firmData, error: firmError } = await admin
        .from("firms")
        .insert(firmPayload)
        .select("id")
        .single();

      const firm = firmData as FirmLookupRow | null;

      if (firmError || !firm) {
        throw firmError ?? new Error("Failed to create firm profile");
      }

      firmId = firm.id;
    }

    const dealerPayload: DealerInsertRow = {
      user_id: data.user_id,
      firm_id: firmId,
      dealer_code: makeCode("BS"),
      referral_code: makeCode("REF"),
      status: "pending_kyc",
      tier: "bronze",
      credit_limit: 0,
      current_balance: 0,
    };

    const { error: dealerError } = await admin
      .from("dealers")
      .upsert(dealerPayload, { onConflict: "user_id" })
      .select("id")
      .single();

    if (dealerError) {
      throw dealerError;
    }

    return { ok: true };
  });
