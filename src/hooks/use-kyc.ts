import { useAuth } from "./use-auth";

export type KycStatus = "none" | "skipped" | "submitted" | "verified";

/**
 * Returns the current KYC state of the authenticated user.
 *
 * Status lifecycle:
 *   none      — new user, KYC never started
 *   skipped   — user chose "Skip for now" during onboarding or KYC page
 *   submitted — documents submitted, awaiting compliance review
 *   verified  — compliance team has approved the documents
 *
 * KYC-gated features (orders, ledger, invoices, referrals) require
 * status === "verified".  Use `needsKyc` as the gate condition.
 */
export function useKycStatus() {
  const { user } = useAuth();
  const raw = (user?.user_metadata?.kyc_status as string | undefined) ?? "none";
  const status = (["none", "skipped", "submitted", "verified"].includes(raw)
    ? raw
    : "none") as KycStatus;

  return {
    status,
    /** True when documents are fully approved by compliance */
    verified: status === "verified",
    /** True when documents have been submitted but not yet reviewed */
    submitted: status === "submitted",
    /** True when KYC hasn't been started or was explicitly skipped */
    needsKyc: status === "none" || status === "skipped",
    /** Friendly label for display */
    label:
      status === "verified"
        ? "Verified"
        : status === "submitted"
          ? "Under review"
          : status === "skipped"
            ? "Skipped"
            : "Not started",
  };
}
