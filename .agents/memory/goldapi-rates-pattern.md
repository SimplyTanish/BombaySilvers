---
name: GoldAPI live rates pattern
description: How live gold/silver rates are fetched, cached, and displayed in this project.
---

# Live Rates via GoldAPI.io

## The rule
All GoldAPI calls happen inside a TanStack Start server function (`createServerFn`). The API key never touches the browser. A module-level in-memory cache (default 5 min) prevents multiple concurrent browser tabs from multiplying API calls.

## How to apply

**Server function** (`src/lib/rates.ts`):
- `fetchLiveRates()` — calls `GET https://www.goldapi.io/api/XAU/INR` and `XAG/INR`
- Header: `x-access-token: process.env.GOLDAPI_KEY`
- Module-level `_cache` with `expiresAt` TTL; refreshes on first call after expiry
- Converts troy-oz prices to MCX display units: gold per 10g, silver per kg
- Throws a recognizable error string (`GOLDAPI_KEY_MISSING`) when key absent — dashboard catches this to show a setup nudge instead of a generic error

**Query hook** (`src/hooks/use-live-rates.ts`):
- `useLiveRates()` — wraps `fetchLiveRates` in `useQuery`, polls every 5 min
- `placeholderData: (prev) => prev` keeps stale data visible while refetching

**Display units:**
- Gold 999: `price_gram_24k × 10` (per 10g, MCX convention)
- Silver 999: `price_gram_24k × 1000` (per kg, MCX convention)

**Sparkline:** `generateSparkline(prevINR, currentINR)` uses sin-wave noise (no `Math.random`) — deterministic on server + client, avoids SSR hydration mismatch.

**GoldAPI plan note:**
- Free: 100 req/month — good for testing, not for 5-min polling
- $10/mo: 500 req/day = ~1 per 3 min; fits the 5-min default TTL
- Override TTL via `GOLDAPI_CACHE_TTL_MS` env var

## Formatting helpers (in `src/lib/rates.ts`)
- `fmtINR(n)` — Indian number grouping (72148 → "72,148")
- `fmtChange(n)` — signed absolute change ("+312", "-145")
- `fmtPct(n)` — signed percentage ("+0.43%")

## Secret key
Add `GOLDAPI_KEY` to Replit Secrets. Without it the dashboard shows a "Live rates not configured" banner with a setup link; all other UI still renders with static fallback values.
