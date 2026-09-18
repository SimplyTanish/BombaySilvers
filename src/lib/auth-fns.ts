/**
 * Server functions for authentication flows.
 * These run on the server so secrets never reach the browser.
 */

import { createServerFn } from "@tanstack/react-start";
import type { Enums } from "@/lib/database.types";

type BusinessType = Enums<"business_type">;
type MetalFocus = Enums<"metal_focus">;
import { createAdminClient } from "@/lib/supabase";

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

    return {
      phone: d.phone.trim(),
    };
  })
  .handler(async ({ data }): Promise<{ found: false } | { found: true; email: string }> => {
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
 * Look up a dealer's email by their dealer ID (dealer code).
 * Returns the email used for OTP login.
 */
export const lookupEmailByDealerCode = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    const d = raw as { dealerCode?: string };

    if (typeof d?.dealerCode !== "string" || !d.dealerCode.trim()) {
      throw new Error("Dealer ID is required");
    }

    return {
      dealerCode: d.dealerCode.trim().toUpperCase(),
    };
  })
  .handler(async ({ data }): Promise<{ found: false } | { found: true; email: string }> => {
    const admin = createAdminClient() as unknown as AdminClientLike;

    const { data: dealerData, error: dealerError } = await admin
      .from("dealers")
      .select("user_id")
      .eq("dealer_code", data.dealerCode)
      .maybeSingle();

    const dealer = dealerData as { user_id: string } | null;

    if (dealerError || !dealer) {
      console.error("Dealer ID lookup failed:", dealerError);
      return { found: false };
    }

    const { data: userData, error: userError } = await admin
      .from("users")
      .select("email")
      .eq("id", dealer.user_id)
      .maybeSingle();

    const user = userData as { email: string | null } | null;

    if (userError || !user) {
      console.error("User lookup failed for dealer:", dealer.user_id);
      return { found: false };
    }

    if (!user.email) {
      console.error("Dealer account has no email registered:", dealer.user_id);
      return { found: false };
    }

    return {
      found: true,
      email: user.email,
    };
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
      phone: typeof d.phone === "string" && d.phone.trim() ? d.phone.trim() : null,
      email: typeof d.email === "string" && d.email.trim() ? d.email.trim() : null,
    } satisfies DealerProfilePayload;
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient() as unknown as AdminClientLike;

    const userPayload: UserInsertRow = {
      id: data.user_id,
      email: data.email,
      phone: data.phone,
      full_name: data.contact_name,
      role: "dealer",
      is_active: true,
    };

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
