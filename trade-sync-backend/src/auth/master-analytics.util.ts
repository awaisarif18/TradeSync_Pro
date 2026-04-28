/** Max closed trades loaded for sparkline + risk metrics (per master). */
export const MASTER_ANALYTICS_CLOSED_CAP = 2000;

/** Points returned for mini equity SVG (downsampled cumulative PnL). */
export const EQUITY_SPARKLINE_POINTS = 48;

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

export type ClosedTradeRow = {
  pnl: number | null;
  closedAt: Date | null;
  createdAt: Date;
};

function effectiveTime(row: ClosedTradeRow): number {
  const t = row.closedAt ?? row.createdAt;
  return t instanceof Date ? t.getTime() : 0;
}

function downsample(points: number[], targetLen: number): number[] {
  if (points.length === 0) return [];
  if (points.length <= targetLen) return [...points];
  const out: number[] = [];
  for (let i = 0; i < targetLen; i += 1) {
    const idx = (i / (targetLen - 1)) * (points.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(Math.ceil(idx), points.length - 1);
    const frac = idx - lo;
    out.push(points[lo] * (1 - frac) + points[hi] * frac);
  }
  return out;
}

function buildCumulativePnL(rowsChronological: ClosedTradeRow[]): number[] {
  let sum = 0;
  const cumulative: number[] = [];
  for (const row of rowsChronological) {
    sum += row.pnl ?? 0;
    cumulative.push(sum);
  }
  return cumulative;
}

function maxDrawdownPercentFromEquity(equity: number[]): number {
  if (equity.length === 0) return 0;
  let peak = equity[0];
  let maxDd = 0;
  for (const e of equity) {
    if (e > peak) peak = e;
    const dd = peak - e;
    if (dd > maxDd) maxDd = dd;
  }
  const scale = Math.max(Math.abs(peak), Math.max(...equity.map(Math.abs)), 1e-6);
  return Number(((maxDd / scale) * 100).toFixed(2));
}

function longestLosingStreak(rowsChronological: ClosedTradeRow[]): number {
  let best = 0;
  let cur = 0;
  for (const row of rowsChronological) {
    const p = row.pnl ?? 0;
    if (p < 0) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

function bestDayPnl(rowsChronological: ClosedTradeRow[]): number {
  const byDay = new Map<string, number>();
  for (const row of rowsChronological) {
    const d = row.closedAt ?? row.createdAt;
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + (row.pnl ?? 0));
  }
  let max = -Infinity;
  for (const v of byDay.values()) {
    if (v > max) max = v;
  }
  if (max === -Infinity) return 0;
  return Number(max.toFixed(2));
}

function avgTradesPerDay(rowsChronological: ClosedTradeRow[]): number {
  if (rowsChronological.length === 0) return 0;
  const first = effectiveTime(rowsChronological[0]);
  const last = effectiveTime(rowsChronological[rowsChronological.length - 1]);
  const spanMs = Math.max(last - first, 24 * 60 * 60 * 1000);
  const spanDays = spanMs / (24 * 60 * 60 * 1000);
  return Number((rowsChronological.length / spanDays).toFixed(2));
}

function activeHoursSummary(rowsChronological: ClosedTradeRow[]): string | null {
  if (rowsChronological.length === 0) return null;
  const buckets = new Array(24).fill(0);
  for (const row of rowsChronological) {
    const d = row.closedAt ?? row.createdAt;
    buckets[d.getUTCHours()] += 1;
  }
  const total = buckets.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

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
  if (bestSum <= 0) return null;
  const endHour = bestStart + 4;
  const pad = (h: number) => `${h}`.padStart(2, '0');
  return `Most signals ${pad(bestStart)}:00–${pad(endHour)}:00 UTC (from recent closed trades)`;
}

/**
 * @param closedRowsNewestFirst — capped query result, newest first; will be reversed internally.
 */
export function computeMasterAnalytics(
  closedRowsNewestFirst: ClosedTradeRow[],
): MasterAnalyticsResult {
  if (closedRowsNewestFirst.length === 0) {
    return {};
  }

  const chronological = [...closedRowsNewestFirst].sort(
    (a, b) => effectiveTime(a) - effectiveTime(b),
  );

  const equity = buildCumulativePnL(chronological);
  const sparkline = downsample(equity, EQUITY_SPARKLINE_POINTS);

  return {
    riskMetrics: {
      maxDrawdownPercent: maxDrawdownPercentFromEquity(equity),
      avgTradesPerDay: avgTradesPerDay(chronological),
      longestLosingStreakTrades: longestLosingStreak(chronological),
      bestDayPnl: bestDayPnl(chronological),
    },
    equitySparkline: sparkline,
    activeHoursSummary: activeHoursSummary(chronological),
  };
}
