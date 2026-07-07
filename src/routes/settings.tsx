import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Bombay Silvers" }] }),
  component: Settings,
});

function Settings() {
  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Platform-wide preferences" />
      <GlassCard className="p-8 text-center text-sm text-muted-foreground">
        Settings surface — notification channels, warehouse defaults, invoice templates, dealer tiers, reward rates. (Mockup stub.)
      </GlassCard>
    </AppShell>
  );
}
