/**
 * Live bullion rates via GoldAPI.io
 *
 * All GoldAPI calls happen server-side so the API key never reaches the browser.
 * A module-level in-memory cache avoids hammering the API when multiple browser
 * tabs are open — every concurrent request within the TTL window is served from
 * cache and counts as a single API call.
 *
 * Default cache TTL: 5 minutes (288 calls/day).
 * GoldAPI paid plan: 500 req/day ($10/mo) — comfortably covers this.
 * Override via GOLDAPI_CACHE_TTL_MS env var.
 */

import { createServerFn } from "@tanstack/react-start";

// ─── Constants ────────────────────────────────────────────────────────────────
const GRAMS_PER_TROY_OZ = 31.1035;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Types ────────────────────────────────────────────────────────────────────
export type MetalRate = {
  /** Display price in INR (gold = per 10g, silver = per kg) */
  priceINR: number;
  /** Previous close in same display unit */
  prevINR: number;
  /** Absolute change in same display unit (may be negative) */
  changeAbs: number;
  /** Percentage change (e.g. 0.43 means +0.43%) */
  changePct: number;
  up: boolean;
  /** Raw price per gram in INR — used for inventory value calculations */
  pricePerGram: number;
  /** Unix timestamp from the API */
  timestamp: number;
};

export type LiveRates = {
  gold: MetalRate; // per 10g (MCX convention)
  silver: MetalRate; // per kg (MCX convention)
  fetchedAt: number; // server epoch ms
  fromCache: boolean;
};

export type RatesError = {
  kind: "no_key" | "api_error" | "network_error";
  message: string;
};

// ─── Raw GoldAPI response shape ───────────────────────────────────────────────
type GoldApiResponse = {
  price: number; // INR per troy oz
  prev_close_price: number;
  ch: number; // change per troy oz
  chp: number; // change %
  price_gram_24k: number; // INR per gram (24k / 999 purity)
  timestamp: number;
};

// ─── Server-side cache ────────────────────────────────────────────────────────
let _cache: { data: LiveRates; expiresAt: number } | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function callGoldApi(
  metal: "XAU" | "XAG",
  apiKey: string
): Promise<GoldApiResponse> {
  const res = await fetch(`https://www.goldapi.io/api/${metal}/INR`, {
    headers: {
      "x-access-token": apiKey,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`GoldAPI ${res.status}: ${body.slice(0, 120)}`), {
      status: res.status,
    });
  }

  return res.json() as Promise<GoldApiResponse>;
}

function toMetalRate(raw: GoldApiResponse, displayMultiplier: number): MetalRate {
  // All spot prices from GoldAPI are per troy oz; price_gram_24k is per gram.
  const priceINR = Math.round(raw.price_gram_24k * displayMultiplier);
  const prevGram = raw.prev_close_price / GRAMS_PER_TROY_OZ;
  const prevINR = Math.round(prevGram * displayMultiplier);
  const changeAbs = priceINR - prevINR;
  const changePct = prevINR !== 0 ? (changeAbs / prevINR) * 100 : 0;
  return {
    priceINR,
    prevINR,
    changeAbs,
    changePct,
    up: changeAbs >= 0,
    pricePerGram: raw.price_gram_24k,
    timestamp: raw.timestamp,
  };
}

// ─── Server function ──────────────────────────────────────────────────────────
export const fetchLiveRates = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveRates> => {
    const apiKey = process.env.GOLDAPI_KEY;

    if (!apiKey) {
      throw new Error(
        "GOLDAPI_KEY_MISSING: Add your GoldAPI.io key to Replit Secrets as GOLDAPI_KEY to enable live rates."
      );
    }

    const now = Date.now();
    const cacheTtl = parseInt(
      process.env.GOLDAPI_CACHE_TTL_MS ?? String(DEFAULT_CACHE_TTL_MS),
      10
    );

    // Serve from cache if still fresh
    if (_cache && now < _cache.expiresAt) {
      return { ..._cache.data, fromCache: true };
    }

    const [gold, silver] = await Promise.all([
      callGoldApi("XAU", apiKey), // gold
      callGoldApi("XAG", apiKey), // silver
    ]);

    const data: LiveRates = {
      gold: toMetalRate(gold, 10), // display per 10g
      silver: toMetalRate(silver, 1000), // display per kg
      fetchedAt: now,
      fromCache: false,
    };

    _cache = { data, expiresAt: now + cacheTtl };
    return data;
  }
);

// ─── Formatting helpers (shared between dashboard + ticker) ──────────────────

/** Format a number using the Indian numbering system (e.g. 72148 → "72,148") */
export function fmtINR(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return grouped + "," + last3;
}

/** Format a signed change value: "+312" or "-145" */
export function fmtChange(n: number): string {
  const abs = fmtINR(Math.abs(n));
  return n >= 0 ? `+${abs}` : `-${abs}`;
}

/** Format a percentage: "+0.43%" */
export function fmtPct(n: number): string {
  const s = Math.abs(n).toFixed(2);
  return n >= 0 ? `+${s}%` : `-${s}%`;
}

/**
 * Generate a deterministic intraday sparkline series from yesterday's close to
 * today's current price. Uses sin-wave noise so the result is identical on
 * server and client (no Math.random → no SSR hydration mismatch).
 */
export function generateSparkline(
  prevClose: number,
  current: number,
  points = 48
): { t: number; v: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const progress = i / (points - 1);
    // Ease-in-out curve so the price "opens" near prevClose and "arrives" at current
    const ease =
      progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
    const trend = prevClose + (current - prevClose) * ease;
    // Deterministic noise: two overlapping sin waves scaled to ~20% of the move
    const amplitude = Math.abs(current - prevClose) * 0.25 + prevClose * 0.0003;
    const noise =
      Math.sin(i * 1.73 + prevClose * 0.0001) * amplitude * 0.6 +
      Math.sin(i * 0.41 + current * 0.0001) * amplitude * 0.4;
    return { t: i, v: Math.max(0, trend + noise) };
  });
}
