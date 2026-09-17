import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { useDealerLookup } from "@/hooks/use-staff";
import { fmtINR } from "@/lib/rates";
import { Loader2, Search, UserRound } from "lucide-react";

export const Route = createFileRoute("/staff/dealers")({
  head: () => ({ meta: [{ title: "Dealer Lookup · Bombay Silvers" }] }),
  component: StaffDealers,
});

const tierTone: Record<string, string> = {
  platinum: "bg-[var(--platinum)]/15 text-[var(--platinum)]",
  gold: "bg-[var(--gold)]/15 text-[var(--gold)]",
  silver: "bg-[var(--silver)]/15 text-[var(--platinum)]",
  basic: "bg-[var(--surface-3)] text-muted-foreground",
};

function StaffDealers() {
  const [query, setQuery] = useState("");
  const { data: dealers, isLoading, isError } = useDealerLookup(query);

  return (
    <RequireRole role={["staff", "admin", "super_admin"]}>
      <AppShell>
        <PageTitle
          title="Dealer lookup"
          subtitle="Find a dealer by name, phone or email"
        />

        <div className="relative mb-5 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone or email…"
            className="h-10 w-full rounded-xl border border-border/70 bg-[var(--surface-2)] pl-9 pr-3 text-sm outline-none focus:border-[var(--silver-muted)]"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {query.trim().length < 2 && (
            <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search.
            </div>
          )}
          {query.trim().length >= 2 && isLoading && (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}
          {query.trim().length >= 2 && isError && (
            <div className="rounded-xl border border-[var(--loss)]/20 bg-[var(--loss)]/5 p-6 text-sm text-[var(--loss)]">
              Search failed.
            </div>
          )}
          {!isLoading && !isError && query.trim().length >= 2 && dealers?.length === 0 && (
            <div className="rounded-xl border border-border/60 bg-[var(--surface-2)]/40 p-8 text-center text-sm text-muted-foreground">
              No dealers found for “{query}”.
            </div>
          )}

          {(dealers ?? []).map((d) => {
            const dealer = d.dealers;
            return (
              <GlassCard key={d.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d9d9dd] to-[#7a7b7f]">
                      <UserRound className="h-4 w-4 text-black" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.full_name ?? d.phone}</div>
                      <div className="truncate text-xs text-muted-foreground">{d.phone}</div>
                    </div>
                  </div>
                  {dealer && (
                    <span className={"rounded-full px-2 py-0.5 text-[11px] " + (tierTone[dealer.tier] ?? "bg-[var(--surface-3)] text-muted-foreground")}>
                      {dealer.tier}
                    </span>
                  )}
                </div>
                {dealer && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg border border-border/50 bg-[var(--surface-2)]/40 p-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Code</div>
                      <div className="mt-0.5 font-mono">{dealer.dealer_code}</div>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-[var(--surface-2)]/40 p-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Balance</div>
                      <div className={"mt-0.5 font-mono " + (Number(dealer.current_balance) < 0 ? "text-[var(--loss)]" : "text-[var(--gain)]")}>
                        ₹{fmtINR(dealer.current_balance)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-[var(--surface-2)]/40 p-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Credit</div>
                      <div className="mt-0.5 font-mono">₹{fmtINR(dealer.credit_limit)}</div>
                    </div>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </AppShell>
    </RequireRole>
  );
}