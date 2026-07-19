---
name: Supabase SSR WebSocket fix
description: How to fix the Node.js < 22 WebSocket error when supabase-js is imported in a TanStack Start SSR context.
---

# Supabase SSR WebSocket fix

## The rule
Pass the `ws` package as the `realtime.transport` option when creating the Supabase client in SSR context.

## Why
`@supabase/realtime-js` tries to detect a WebSocket constructor at `createClient()` time. Node.js 20 has no native WebSocket. This crashes SSR (`renderToReadableStream`) with:
> "Node.js 20 detected without native WebSocket support."

The `ws` npm package is already in `package.json` and has a browser shim (`ws/browser.js`), so it can be safely used in both SSR and browser builds.

## How to apply
In `src/lib/supabase.ts`, use `import.meta.env.SSR` (a Vite build-time constant) to conditionally import `ws`:

```ts
let wsTransport: typeof WebSocket | undefined;
if (import.meta.env.SSR) {
  const { default: ws } = await import("ws");
  wsTransport = ws as unknown as typeof WebSocket;
}

export const supabase = createClient(url, key, {
  auth: { ... },
  ...(wsTransport && { realtime: { transport: wsTransport } }),
});
```

- `import.meta.env.SSR = true` in server build → `ws` loaded and used
- `import.meta.env.SSR = false` in browser build → entire block tree-shaken by Vite; `ws` NOT bundled for browser (browser uses its own shim via `ws/browser.js`)
- Top-level `await import(...)` is valid in ESM (`"type": "module"` in package.json)
