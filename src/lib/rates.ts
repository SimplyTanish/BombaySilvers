/**
 * Live bullion rates derived from COMEX gold & silver futures (GC=F, SI=F)
 * plus the USD/INR exchange rate, all sourced from Yahoo Finance's free v8
 * chart API.  Import duties and GST are applied to approximate MCX-equivalent
 * INR pricing for the dealer dashboard.
 *
 * MCX's own website blocks server-side requests (Akamai bot protection), so
 * we derive the rates instead.  The duty/premium multipliers are configurable
 * via env vars and default to recent approximate values.
 */
import { createServerFn } from "@tanstack/react-start";

const TROY_OZ_GRAMS = 31.1035;
const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const DEFAULT_CACHE_TTL_MS = 30 * 1000;

export type MetalRate = {
  priceINR: number;
  prevINR: number;
  changeAbs: number;
  changePct: number;
  up: boolean;
  pricePerGram: number;
  timestamp: number;
};

export type LiveRates = {
  gold: MetalRate;
  silver: MetalRate;
  fetchedAt: number;
  fromCache: boolean;
};

type YahooMeta = {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
};

type YahooChart = {
  chart?: {
    result?: Array<{ meta: YahooMeta }>;
  };
};

let cache: { data: LiveRates; expiresAt: number } | null = null;

function asNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

async function fetchYahooQuote(symbol: string): Promise<YahooMeta> {
  const res = await fetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=1d`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok)
    throw new Error(`Yahoo ${symbol} ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const text = await res.text();
  // Yahoo appends a second JSON object (warnings/metadata) on a new line, so
  // try every line and take the first chunk that parses to a chart result.
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const payload = JSON.parse(line) as YahooChart;
      const meta = payload.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice !== undefined) return meta;
    } catch {
      /* try next line */
    }
  }
  throw new Error(`Yahoo ${symbol} empty result: ${text.slice(0, 400)}`);
}

function pctEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function toRate(
  usdPerOz: number,
  prevUsd: number,
  usdinr: number,
  gramsUnit: number,
  dutyPct: number,
): MetalRate {
  // usdinr / 31.1035 = INR per gram; * gramsUnit = INR per display unit
  const factor = (usdinr / TROY_OZ_GRAMS) * gramsUnit;
  const duty = 1 + dutyPct / 100;
  const priceINR = Math.round(usdPerOz * factor * duty);
  const prevINR = Math.round(prevUsd * factor * duty);
  const changeAbs = priceINR - prevINR;
  const changePct = prevINR === 0 ? 0 : (changeAbs / prevINR) * 100;
  const gramsInUnit = 1 / gramsUnit;
  return {
    priceINR,
    prevINR,
    changeAbs,
    changePct,
    up: changeAbs >= 0,
    pricePerGram: priceINR * gramsInUnit,
    timestamp: Date.now(),
  };
}

export const fetchLiveRates = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveRates> => {
    const now = Date.now();
    const parsedTtl = Number.parseInt(
      process.env.MCX_CACHE_TTL_MS ?? String(DEFAULT_CACHE_TTL_MS),
      10,
    );
    const cacheTtl = Number.isFinite(parsedTtl) ? parsedTtl : DEFAULT_CACHE_TTL_MS;
    if (cache && now < cache.expiresAt) return { ...cache.data, fromCache: true };

    const goldDuty = pctEnv("MCX_GOLD_DUTY_PCT", 13);
    const silverDuty = pctEnv("MCX_SILVER_DUTY_PCT", 17);

    const [goldQuote, silverQuote, fxQuote] = await Promise.all([
      fetchYahooQuote("GC=F"),
      fetchYahooQuote("SI=F"),
      fetchYahooQuote("USDINR=X"),
    ]);

    const goldPrice = asNum(goldQuote.regularMarketPrice);
    const goldPrev = asNum(goldQuote.chartPreviousClose) ?? goldPrice;
    const silverPrice = asNum(silverQuote.regularMarketPrice);
    const silverPrev = asNum(silverQuote.chartPreviousClose) ?? silverPrice;
    const usdinr = asNum(fxQuote.regularMarketPrice);

    if (goldPrice === undefined || silverPrice === undefined || usdinr === undefined) {
      const meta = JSON.stringify({ goldQuote, silverQuote, fxQuote }).slice(0, 500);
      throw new Error(
        `Yahoo Finance returned incomplete data: gold=${goldPrice} silver=${silverPrice} usdinr=${usdinr} meta=${meta}`,
      );
    }

    // Gold: COMEX quotes per troy ounce → MCX per 10 grams (gramsUnit = 10)
    // Silver: COMEX quotes per troy ounce → MCX per 1 kilogram  (gramsUnit = 1000)
    const gold = toRate(goldPrice, goldPrev ?? goldPrice, usdinr, 10, goldDuty);
    const silver = toRate(silverPrice, silverPrev ?? silverPrice, usdinr, 1000, silverDuty);

    const data: LiveRates = { gold, silver, fetchedAt: now, fromCache: false };
    cache = { data, expiresAt: now + cacheTtl };
    return data;
  },
);

export function fmtINR(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

export function fmtChange(n: number): string {
  const abs = fmtINR(Math.abs(n));
  return n >= 0 ? `+${abs}` : `-${abs}`;
}

export function fmtPct(n: number): string {
  const s = Math.abs(n).toFixed(2);
  return n >= 0 ? `+${s}%` : `-${s}%`;
}

/** Synthetic history is retained when a live historical endpoint is unavailable. */
export function generateSparkline(
  prevClose: number,
  current: number,
  points = 48,
): { t: number; v: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const progress = i / (points - 1);
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    const trend = prevClose + (current - prevClose) * ease;
    const amplitude = Math.abs(current - prevClose) * 0.25 + prevClose * 0.0003;
    const noise =
      Math.sin(i * 1.73 + prevClose * 0.0001) * amplitude * 0.6 +
      Math.sin(i * 0.41 + current * 0.0001) * amplitude * 0.4;
    return { t: i, v: Math.max(0, trend + noise) };
  });
}
