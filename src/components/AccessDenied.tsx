import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-[var(--surface-2)] p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-red-500/10">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold">403</h1>

        <h2 className="mt-2 text-lg font-semibold">Access Denied</h2>

        <p className="mt-3 text-sm text-muted-foreground">
          You don't have permission to access this page.
        </p>

        <Link
          to="/dashboard"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--silver-muted)] px-6 text-sm font-medium text-black transition hover:opacity-90"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
