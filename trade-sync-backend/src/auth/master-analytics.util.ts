import { TradeLog } from '../database/tradelog.entity';

/** Max closed trades loaded for sparkline + risk metrics (per master). */
export const MASTER_ANALYTICS_CLOSED_CAP = 2000;

/** Downsampled equity curve length when trade count exceeds this threshold. */
export const EQUITY_SPARKLINE_POINTS = 50;

export interface MasterRiskMetrics {
  maxDrawdownPercent: number;
  avgTradesPerDay: number;
  longestLosingStreakTrades: number;
  bestDayPnl: number;
}

export interface MasterAnalyticsResult {
  riskMetrics?: MasterRiskMetrics;
  equitySparkline?: number[];
  activeHoursSummary?: string | null;
}

/** Narrow row shape for callers that only select `pnl`, `closedAt`, `createdAt`. */
export type ClosedTradeRow = {
  pnl: number | null;
  closedAt: Date | null;
  createdAt: Date;
};

function effectiveCloseTime(row: Pick<TradeLog, 'closedAt' | 'createdAt'>): Date {
  return row.closedAt ?? row.createdAt;
}

function calendarDaysInclusive(earliest: Date, latest: Date): number {
  const e = earliest.toISOString().slice(0, 10);
  const l = latest.toISOString().slice(0, 10);
  const de = Date.parse(`${e}T00:00:00.000Z`);
  const dl = Date.parse(`${l}T00:00:00.000Z`);
  const diff = Math.round((dl - de) / 86400000);
  return Math.max(1, diff + 1);
}

/**
 * CLOSED trades for one master, oldest-first by `closedAt` (use `createdAt` only where needed for ordering fallback).
 */
export function computeRiskMetrics(trades: TradeLog[]): MasterRiskMetrics | null {
  if (trades.length === 0) {
    return null;
  }

  let cumulative = 0;
  let peak = 0;
  let maxDrawdownPercent = 0;

  for (const t of trades) {
    cumulative += t.pnl ?? 0;
    peak = Math.max(peak, cumulative);
    const ddPct =
      peak > 0 ? ((peak - cumulative) / Math.abs(peak)) * 100 : 0;
    if (ddPct > maxDrawdownPercent) {
      maxDrawdownPercent = ddPct;
    }
  }

  const first = effectiveCloseTime(trades[0]);
  const last = effectiveCloseTime(trades[trades.length - 1]);
  const dayCount = calendarDaysInclusive(first, last);
  const avgTradesPerDay = Number((trades.length / dayCount).toFixed(2));

  let longestLosingStreakTrades = 0;
  let curStreak = 0;
  for (const t of trades) {
    const p = t.pnl ?? 0;
    if (p < 0) {
      curStreak += 1;
      if (curStreak > longestLosingStreakTrades) {
        longestLosingStreakTrades = curStreak;
      }
    } else {
      curStreak = 0;
    }
  }

  const byDay = new Map<string, number>();
  for (const t of trades) {
    const d = t.closedAt ?? t.createdAt;
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + (t.pnl ?? 0));
  }
  let bestDayPnl = -Infinity;
  for (const v of byDay.values()) {
    if (v > bestDayPnl) {
      bestDayPnl = v;
    }
  }
  if (bestDayPnl === -Infinity) {
    bestDayPnl = 0;
  } else {
    bestDayPnl = Number(bestDayPnl.toFixed(2));
  }

  return {
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
    avgTradesPerDay,
    longestLosingStreakTrades,
    bestDayPnl,
  };
}

function buildCumulativePnLSequence(trades: TradeLog[]): number[] {
  let sum = 0;
  const out: number[] = [];
  for (const t of trades) {
    sum += t.pnl ?? 0;
    out.push(sum);
  }
  return out;
}

/**
 * CLOSED trades for one master, oldest-first by close time.
 */
export function computeEquitySparkline(trades: TradeLog[]): number[] | null {
  if (trades.length < 2) {
    return null;
  }

  const cumulative = buildCumulativePnLSequence(trades);
  const len = cumulative.length;

  if (len <= 50) {
    return cumulative.map((x) => Number(x.toFixed(2)));
  }

  const sampled: number[] = [];
  for (let i = 0; i <= 49; i += 1) {
    const idx = Math.round((i * (len - 1)) / 49);
    sampled.push(Number(cumulative[idx].toFixed(2)));
  }
  return sampled;
}

/**
 * CLOSED trades for one master (order irrelevant); buckets UTC hour of close.
 */
export function computeActiveHours(trades: TradeLog[]): number[] | null {
  if (trades.length === 0) {
    return null;
  }

  const buckets = new Array<number>(24).fill(0);
  for (const t of trades) {
    const d = t.closedAt ?? t.createdAt;
    buckets[d.getUTCHours()] += 1;
  }
  return buckets;
}

function activeHoursSummaryFromBuckets(buckets: number[]): string | null {
  const total = buckets.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return null;
  }

  let bestStart = 0;
  let bestSum = -1;
  for (let start = 0; start <= 20; start += 1) {
    const windowSum =
      buckets[start] +
      buckets[start + 1] +
      buckets[start + 2] +
      buckets[start + 3];
    if (windowSum > bestSum) {
      bestSum = windowSum;
      bestStart = start;
    }
  }
  if (bestSum <= 0) {
    return null;
  }
  const endHour = bestStart + 4;
  const pad = (h: number) => `${h}`.padStart(2, '0');
  return `Most signals ${pad(bestStart)}:00–${pad(endHour)}:00 UTC (from recent closed trades)`;
}

export function buildAnalytics(
  trades: TradeLog[],
): {
  riskMetrics: MasterRiskMetrics;
  equitySparkline: number[] | null;
  activeHoursSummary: string | null;
} | null {
  if (trades.length === 0) {
    return null;
  }

  const riskMetrics = computeRiskMetrics(trades);
  if (!riskMetrics) {
    return null;
  }

  const equitySparkline = computeEquitySparkline(trades);
  const activeHoursBuckets = computeActiveHours(trades);
  const activeHoursSummary =
    activeHoursBuckets !== null
      ? activeHoursSummaryFromBuckets(activeHoursBuckets)
      : null;

  return {
    riskMetrics,
    equitySparkline,
    activeHoursSummary,
  };
}

function effectiveTime(row: ClosedTradeRow): number {
  const t = row.closedAt ?? row.createdAt;
  return t instanceof Date ? t.getTime() : 0;
}

/**
 * @param closedRowsNewestFirst — capped query result, newest first; reversed to chronological for analytics.
 */
export function computeMasterAnalytics(
  closedRowsNewestFirst: ClosedTradeRow[],
): MasterAnalyticsResult {
  if (closedRowsNewestFirst.length === 0) {
    return {};
  }

  const chronological = [...closedRowsNewestFirst].sort(
    (a, b) => effectiveTime(a) - effectiveTime(b),
  ) as TradeLog[];

  const built = buildAnalytics(chronological);
  if (!built) {
    return {};
  }

  const out: MasterAnalyticsResult = {
    riskMetrics: built.riskMetrics,
    activeHoursSummary: built.activeHoursSummary,
  };

  if (built.equitySparkline !== null) {
    out.equitySparkline = built.equitySparkline;
  }

  return out;
}
