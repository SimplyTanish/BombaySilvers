import { useAuth } from "./use-auth";

export type KycStatus = "none" | "skipped" | "submitted" | "verified";

export function useKycStatus() {
  const { dealer } = useAuth();

  // Map the dealer status from the database to a KYC status.
  // For the current beta:
  // active = verified
  // everything else = not verified
  const status: KycStatus =
    dealer?.status === "active" ? "verified" : "none";

  return {
  status,
  verified: dealer?.status === "active",
  submitted: false,
  needsKyc: dealer?.status !== "active",
  label: dealer?.status === "active"
    ? "Verified"
    : "Not started",
};
}