// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

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
      port: 5000,
      strictPort: true,
      allowedHosts: true,
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false,
        outDir: ".output/public",
        includeAssets: ["favicon.ico"],
        manifest: {
          name: "Bombay Silvers — Dealer Terminal",
          short_name: "BombaySilvers",
          description:
            "The operating system of the Bombay Silvers dealer network. Bullion rates, inventory, orders, invoices and ledger.",
          theme_color: "#101012",
          background_color: "#101012",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
          lang: "en",
          categories: ["business", "finance", "shopping"],
          icons: [
            {
              src: "/icons/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icons/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/icons/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: "/",
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\//,
              handler: "NetworkOnly",
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
              handler: "NetworkOnly",
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\//,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-storage",
                expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: "module",
          // NOTE: no navigateFallback here on purpose. The dev SW has no
          // precache entry for "/", so a fallback route throws Workbox
          // "non-precached-url" in the console on every navigation. The dev
          // server SSR handles deep links without a SW fallback.
        },
      }),
    ],
  },
});
