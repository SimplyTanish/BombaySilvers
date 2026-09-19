/**
 * MCX trading-session calendar (India Standard Time).
 *
 * MCX bullion futures trade Monday–Friday in two sessions:
 *   Day session  09:00–17:00 IST
 *   Evening session 17:00–23:30 IST
 *
 * The market is therefore "open" any Mon–Fri between 09:00 and 23:30 IST.
 * India does not observe DST, so a fixed +05:30 offset is exact for all dates.
 */

import { useEffect, useState } from "react";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30
const OPEN_START_MIN = 9 * 60; // 09:00 IST
const OPEN_END_MIN = 23 * 60 + 30; // 23:30 IST
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Shift a Date so its UTC wall-clock equals IST wall-clock.
 * e.g. 2026-09-19 06:00 UTC (== 11:30 IST) → 2026-09-19 11:30 "UTC fields".
 */
function istWall(now: Date): Date {
  return new Date(now.getTime() + IST_OFFSET_MS);
}

/** True when `now` falls within a live MCX session. */
export function isMarketOpen(now: Date = new Date()): boolean {
  const w = istWall(now);
  const dow = w.getUTCDay(); // 0 = Sun
  const mins = w.getUTCHours() * 60 + w.getUTCMinutes();
  if (dow === 0 || dow === 6) return false;
  return mins >= OPEN_START_MIN && mins <= OPEN_END_MIN;
}

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Next session opening time as a real Date (UTC instant), or `null` when
 * the market is currently open. Skips weekends.
 */
export function nextOpen(now: Date = new Date()): Date | null {
  if (isMarketOpen(now)) return null;

  const w = istWall(now);
  const dow = w.getUTCDay();
  const mins = w.getUTCHours() * 60 + w.getUTCMinutes();

  // Anchor to IST midnight of today.
  let cand = new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()));

  // If today is a weekday and we're before 09:00, open today.
  if (dow >= 1 && dow <= 5 && mins < OPEN_START_MIN) {
    cand = new Date(cand.getTime() + OPEN_START_MIN * 60 * 1000);
    return new Date(cand.getTime() - IST_OFFSET_MS);
  }

  // Otherwise advance to the next weekday, then set 09:00.
  for (let i = 0; i < 8; i++) {
    cand = new Date(cand.getTime() + DAY_MS);
    const d = cand.getUTCDay();
    if (d >= 1 && d <= 5) {
      cand = new Date(cand.getTime() + OPEN_START_MIN * 60 * 1000);
      return new Date(cand.getTime() - IST_OFFSET_MS);
    }
  }
  return null; // unreachable
}

/** "Mon 09:00" style label for a session-opening instant. */
export function nextOpenLabel(next: Date): string {
  const w = istWall(next);
  return `${WEEKDAYS[w.getUTCDay()].slice(0, 3)} ${String(w.getUTCHours()).padStart(2, "0")}:${String(
    w.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

export type MarketStatus = {
  open: boolean;
  nextOpenLabel: string | null;
};

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const open = isMarketOpen(now);
  const nxt = open ? null : nextOpen(now);
  return { open, nextOpenLabel: nxt ? nextOpenLabel(nxt) : null };
}

/**
 * Client hook that re-evaluates the MCX session status every 30s so the
 * header badge and polling cadence stay accurate across session boundaries.
 */
export function useMarketStatus(): MarketStatus {
  const [status, setStatus] = useState<MarketStatus>(() => getMarketStatus());

  useEffect(() => {
    const update = () => setStatus(getMarketStatus());
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return status;
}
