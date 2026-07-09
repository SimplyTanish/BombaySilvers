---
name: Replit webview 502 with dual port mappings
description: Public .replit.dev proxy returns 502 even though the dev server is confirmed healthy (curl localhost returns 200); root cause was conflicting .replit port config, not app code.
---

If a Replit `webview` workflow's public `.replit.dev` URL returns 502 while `curl localhost:<port>` returns 200 and the server logs show it bound to `0.0.0.0` on the correct `waitForPort`, check `.replit` for **multiple `[[ports]]` entries mapping different `localPort`s to the same `externalPort`** (e.g. two entries both routing to `externalPort = 80`). This ambiguity can make the proxy 502 unpredictably.

**Why:** encountered this after changing a project's dev port from 5173 to 5000 for Replit webview compatibility. Restarting the workflow repeatedly did not fix the 502 — only removing the stray duplicate port mapping did.

**How to apply:** for `webview` workflows, ensure there is exactly one `[[ports]]` entry with `externalPort = 80`, pointing at the port the server actually binds (per repl-setup/debug-workflow-ports-issues skills, this must be 5000 for webview apps). Remove any other entries mapping to the same external port before assuming it's a platform outage.
