/**
 * Live bullion rates via BullionLive Business API.
 *
 * The public client keeps the same LiveRates contract; only this server-side
 * adapter knows about BullionLive's transport and response formats.
 */
import { createServerFn } from "@tanstack/react-start";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_BULLIONLIVE_URL = "https://bullionlive.app/api/price";

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

export type RatesError = {
  kind: "no_key" | "api_error" | "network_error";
  message: string;
};

type BullionLiveMetal = Record<string, unknown>;
type BullionLiveResponse = Record<string, unknown> & {
  metals?: Record<string, BullionLiveMetal>;
  rates?: Record<string, BullionLiveMetal>;
  data?: Record<string, unknown>;
};

let cache: { data: LiveRates; expiresAt: number } | null = null;

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function pickNumber(source: BullionLiveMetal, names: string[]): number | undefined {
  for (const name of names) {
    const value = asNumber(source[name]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function timestampMs(value: unknown): number {
  const numeric = asNumber(value);
  if (numeric !== undefined) return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function getMetal(payload: BullionLiveResponse, metal: "gold" | "silver"): BullionLiveMetal {
  const candidates = [
    payload.metals?.[metal],
    payload.metals?.[metal === "gold" ? "XAU" : "XAG"],
    payload.rates?.[metal],
    payload.rates?.[metal === "gold" ? "XAU" : "XAG"],
    payload.data?.[metal],
  ];
  const result = candidates.find(
    (candidate): candidate is BullionLiveMetal =>
      typeof candidate === "object" && candidate !== null && !Array.isArray(candidate),
  );
  if (!result) throw new Error(`BullionLive response does not include ${metal} pricing.`);
  return result;
}

/**
 * BullionLive Business can return its retail feed in INR/gram. Those values
 * are intentionally used as-is. The other accepted fields cover the standard
 * Business response aliases without falling back to a foreign-exchange rate.
 */
function toMetalRate(
  raw: BullionLiveMetal,
  displayMultiplier: number,
  responseTimestamp: unknown,
): MetalRate {
  const pricePerGram = pickNumber(raw, [
    "retailPriceInrPerGram",
    "retail_price_inr_per_gram",
    "priceInrPerGram",
    "price_inr_per_gram",
    "inrPerGram",
    "inr_per_gram",
    "priceINR",
    "priceInr",
    "price",
  ]);
  if (pricePerGram === undefined) {
    throw new Error("BullionLive did not return INR retail pricing per gram.");
  }

  const previousPerGram = pickNumber(raw, [
    "previousRetailPriceInrPerGram",
    "previous_retail_price_inr_per_gram",
    "prevPriceInrPerGram",
    "prev_price_inr_per_gram",
    "previousPriceInr",
    "prevPriceInr",
    "previous_price",
    "prev_price",
  ]);
  const changePerGram = pickNumber(raw, [
    "changeInrPerGram",
    "change_inr_per_gram",
    "changeInr",
    "change",
  ]);
  const previous =
    previousPerGram ?? (changePerGram === undefined ? pricePerGram : pricePerGram - changePerGram);
  const priceINR = Math.round(pricePerGram * displayMultiplier);
  const prevINR = Math.round(previous * displayMultiplier);
  const changeAbs = priceINR - prevINR;
  const suppliedPct = pickNumber(raw, ["changePercent", "change_percent", "changePct", "chp"]);
  const changePct = suppliedPct ?? (prevINR === 0 ? 0 : (changeAbs / prevINR) * 100);

  return {
    priceINR,
    prevINR,
    changeAbs,
    changePct,
    up: changeAbs >= 0,
    pricePerGram,
    timestamp: timestampMs(
      raw.updatedAt ?? raw.updated_at ?? raw.timestamp ?? raw.ts ?? responseTimestamp,
    ),
  };
}

async function callBullionLive(apiKey: string): Promise<BullionLiveResponse> {
  const baseUrl = process.env.BULLIONLIVE_API_URL ?? DEFAULT_BULLIONLIVE_URL;
  const url = new URL(baseUrl);
  // BullionLive's keyed feed accepts a key parameter; headers are sent too so
  // Business accounts configured for bearer/x-api-key authentication work unchanged.
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw Object.assign(new Error(`BullionLive ${response.status}: ${body.slice(0, 120)}`), {
      status: response.status,
    });
  }
  return response.json() as Promise<BullionLiveResponse>;
}

export const fetchLiveRates = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveRates> => {
    const apiKey = process.env.BULLIONLIVE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "BULLIONLIVE_API_KEY_MISSING: Add BULLIONLIVE_API_KEY to server environment variables to enable live rates.",
      );
    }

    const now = Date.now();
    const parsedTtl = Number.parseInt(
      process.env.BULLIONLIVE_CACHE_TTL_MS ?? String(DEFAULT_CACHE_TTL_MS),
      10,
    );
    const cacheTtl = Number.isFinite(parsedTtl) ? parsedTtl : DEFAULT_CACHE_TTL_MS;
    if (cache && now < cache.expiresAt) return { ...cache.data, fromCache: true };

    const payload = await callBullionLive(apiKey);
    const data: LiveRates = {
      gold: toMetalRate(getMetal(payload, "gold"), 10, payload.updatedAt ?? payload.timestamp),
      silver: toMetalRate(
        getMetal(payload, "silver"),
        1000,
        payload.updatedAt ?? payload.timestamp,
      ),
      fetchedAt: now,
      fromCache: false,
    };
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
