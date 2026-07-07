// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      // Replit proxies the preview through a dynamic *.pike.replit.dev subdomain.
      // host: "0.0.0.0" is required so Vite binds on all interfaces (not just lo).
      // allowedHosts: true is required because the subdomain changes per-repl and
      // cannot be statically allowlisted. This is dev-only; production builds are
      // served by Nitro, not the Vite dev server.
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      allowedHosts: true,
    },
  },
});
