/**
 * KycGate — blocks access to KYC-required features.
 *
 * Usage:
 *   <KycGate feature="ledger transactions">
 *     <LedgerTable />
 *   </KycGate>
 *
 * When KYC is not complete the children are blurred out and an overlay
 * explains what's needed.  When verified the children render normally.
 */

import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { useKycStatus } from "@/hooks/use-kyc";

interface Props {
  /** Short description of what the user is trying to access, e.g. "place orders" */
  feature: string;
  children: ReactNode;
}

export function KycGate({ feature, children }: Props) {
  const { needsKyc, status } = useKycStatus();
  const navigate = useNavigate();

  if (!needsKyc) return <>{children}</>;

  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-2xl">
      {/* Blurred content preview */}
      <div
        className="pointer-events-none select-none blur-[6px] opacity-30"
        aria-hidden
      >
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-2xl border border-[var(--warn)]/30 bg-background/80 p-8 text-center backdrop-blur-sm">
        <div className="grid h-14 w-14 place-items-center rounded-full border border-[var(--warn)]/30 bg-[var(--warn)]/10">
          <ShieldAlert className="h-7 w-7 text-[var(--warn)]" />
        </div>

        <div>
          <div className="text-base font-semibold">KYC required to {feature}</div>
          <div className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {status === "submitted"
              ? "Your documents are under review. This feature will unlock once compliance approves your KYC."
              : "Complete your KYC verification to unlock this feature. It only takes a few minutes."}
          </div>
        </div>

        {status !== "submitted" && (
          <button
            onClick={() => navigate({ to: "/kyc" })}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-5 py-2.5 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
          >
            Complete KYC <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {status === "submitted" && (
          <span className="rounded-full border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-3 py-1 text-xs text-[var(--warn)]">
            Under review · typically 2 business days
          </span>
        )}
      </div>
    </div>
  );
}
