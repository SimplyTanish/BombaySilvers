import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, LiveDot, PageTitle } from "@/components/AppShell";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users2, Boxes, ScrollText, IndianRupee, Pencil, ShieldAlert } from "lucide-react";
import { RequireRole } from "@/components/RequireRole";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Bombay Silvers" }] }),
  component: Admin,
});

const series = Array.from({ length: 30 }, (_, i) => ({
  d: i,
  gold: 71000 + Math.sin(i / 3) * 400 + i * 12,
  silver: 88500 + Math.cos(i / 4) * 350 + i * 8,
}));

const dealers = [
  { name: "Mehta Bullion Traders", city: "Surat", vol: "₹4.2 Cr", tier: "Platinum", status: "Active" },
  { name: "Sanghvi Metals", city: "Rajkot", vol: "₹3.1 Cr", tier: "Gold", status: "Active" },
  { name: "Kotecha & Sons", city: "Jaipur", vol: "₹1.8 Cr", tier: "Gold", status: "Active" },
  { name: "Shree Silver Mart", city: "Indore", vol: "₹0", tier: "—", status: "KYC" },
  { name: "Vasa Bullion", city: "Vadodara", vol: "₹2.6 Cr", tier: "Gold", status: "Active" },
  { name: "Chandan Jewels", city: "Delhi", vol: "₹0.9 Cr", tier: "Silver", status: "Suspended" },
];

const audit = [
  { t: "14:22", u: "admin@bs", a: "Updated Gold 999 rate → ₹72,148", ip: "103.24.11.4" },
  { t: "13:58", u: "staff.priya", a: "Approved order #BS-24-11279", ip: "10.0.14.8" },
  { t: "12:04", u: "admin@bs", a: "Adjusted credit limit · Mehta Bullion → ₹2.5 Cr", ip: "103.24.11.4" },
  { t: "11:47", u: "staff.arjun", a: "Restocked SKU AU-999-100G · +40", ip: "10.0.14.12" },
  { t: "09:31", u: "system", a: "Failed login attempt · dealer BS-D-0114", ip: "49.207.xx.xx" },
];

function Admin() {
  return (
    <RequireRole role={["admin", "super_admin"]}>
      <AppShell>
        <PageTitle
          title="Admin dashboard"
          subtitle="Network health · rate controls · audit"
          actions={<LiveDot label="System healthy" />}
        />

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPI i={Users2} l="Active dealers" v="1,284" d="+23 this week" tone="gain" />
          <KPI i={IndianRupee} l="MTD turnover" v="₹128.4 Cr" d="+12.4% MoM" tone="gain" />
          <KPI i={ScrollText} l="Open orders" v="342" d="₹18.2 Cr in flight" />
          <KPI i={Boxes} l="Inventory value" v="₹94.8 Cr" d="4 warehouses" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rate history · 30 days</div>
                <div className="mt-1 text-sm text-muted-foreground">Publish curve managed by admin</div>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--gold)" }} /> Gold 999</span>
                <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--platinum)" }} /> Silver 999</span>
              </div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <XAxis dataKey="d" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} domain={["dataMin - 200", "dataMax + 200"]} />
                  <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="gold" stroke="var(--gold)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="silver" stroke="var(--platinum)" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Publish today's rates</div>
            {[
              ["Gold 999", "72,148"],
              ["Gold 995", "71,860"],
              ["Silver 999", "89,420"],
              ["Platinum", "31,200"],
            ].map(([l, v]) => (
              <div key={l} className="mt-3 flex items-center gap-2">
                <div className="w-24 text-xs text-muted-foreground">{l}</div>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">₹</span>
                  <input defaultValue={v} className="h-10 w-full rounded-lg border border-border/70 bg-[var(--surface-2)] pl-7 pr-3 font-mono text-sm outline-none focus:border-[var(--silver-muted)]" />
                </div>
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-border/70 bg-[var(--surface-2)]">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
            <button className="mt-5 h-11 w-full rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              Publish to 1,284 dealers
            </button>
            <div className="mt-3 text-[11px] text-muted-foreground">
              Push notification will fire within ~2s of publish.
            </div>
          </GlassCard>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-border/60 p-4 text-sm font-medium">Dealers</div>
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="p-3 text-left">Firm</th>
                  <th className="p-3 text-left">City</th>
                  <th className="p-3 text-right">Volume (MTD)</th>
                  <th className="p-3 text-left">Tier</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((d) => (
                  <tr key={d.name} className="border-b border-border/40 last:border-0 hover:bg-[var(--surface-2)]/60">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#d9d9dd] to-[#7a7b7f] font-mono text-[10px] font-bold text-black">
                          {d.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                        <span>{d.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{d.city}</td>
                    <td className="p-3 text-right font-mono">{d.vol}</td>
                    <td className="p-3">{d.tier}</td>
                    <td className="p-3">
                      <span className={
                        "rounded-full px-2 py-0.5 text-[11px] " +
                        (d.status === "Active" ? "bg-[var(--gain)]/10 text-[var(--gain)]" :
                         d.status === "KYC" ? "bg-[var(--warn)]/10 text-[var(--warn)]" :
                         "bg-[var(--loss)]/10 text-[var(--loss)]")
                      }>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> Audit log · live
            </div>
            <div className="mt-4 space-y-3">
              {audit.map((a, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-[var(--surface-2)]/60 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-muted-foreground">{a.t}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{a.ip}</span>
                  </div>
                  <div className="mt-1">{a.a}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">by {a.u}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </AppShell>
    </RequireRole>
  );
}

function KPI({ i: Icon, l, v, d, tone }: { i: React.ComponentType<{ className?: string }>; l: string; v: string; d: string; tone?: "gain" }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{l}</div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-3)]">
          <Icon className="h-4 w-4 text-[var(--platinum)]" />
        </div>
      </div>
      <div className="metallic-text mt-3 font-mono text-2xl font-semibold">{v}</div>
      <div className={"text-xs " + (tone === "gain" ? "text-[var(--gain)]" : "text-muted-foreground")}>{d}</div>
    </GlassCard>
  );
}
