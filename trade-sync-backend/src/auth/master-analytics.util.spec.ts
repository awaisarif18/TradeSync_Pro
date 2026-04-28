import {
  computeMasterAnalytics,
  EQUITY_SPARKLINE_POINTS,
  MASTER_ANALYTICS_CLOSED_CAP,
  type ClosedTradeRow,
} from './master-analytics.util';

function row(
  pnl: number,
  closedAt: Date | null,
  createdAt: Date,
): ClosedTradeRow {
  return { pnl, closedAt, createdAt };
}

describe('computeMasterAnalytics', () => {
  it('returns empty object when no rows', () => {
    expect(computeMasterAnalytics([])).toEqual({});
  });

  it('handles single closed trade (newest-first input)', () => {
    const t = new Date('2024-06-01T14:00:00.000Z');
    const out = computeMasterAnalytics([row(50, t, t)]);
    expect(out.riskMetrics?.longestLosingStreakTrades).toBe(0);
    expect(out.riskMetrics?.bestDayPnl).toBe(50);
    expect(out.equitySparkline?.length).toBeLessThanOrEqual(EQUITY_SPARKLINE_POINTS);
    expect(out.equitySparkline?.[out.equitySparkline.length - 1]).toBe(50);
  });

  it('computes longest losing streak', () => {
    const d0 = new Date('2024-01-01T10:00:00.000Z');
    const d1 = new Date('2024-01-01T11:00:00.000Z');
    const d2 = new Date('2024-01-01T12:00:00.000Z');
    const d3 = new Date('2024-01-01T13:00:00.000Z');
    const newestFirst = [row(5, d3, d3), row(-1, d2, d2), row(-2, d1, d1), row(-3, d0, d0)];
    const out = computeMasterAnalytics(newestFirst);
    expect(out.riskMetrics?.longestLosingStreakTrades).toBe(3);
  });

  it('picks best calendar day when all days are negative', () => {
    const a = new Date('2024-03-01T09:00:00.000Z');
    const b = new Date('2024-03-02T09:00:00.000Z');
    const newestFirst = [row(-5, b, b), row(-20, a, a)];
    const out = computeMasterAnalytics(newestFirst);
    expect(out.riskMetrics?.bestDayPnl).toBe(-5);
  });

  it('exports cap constant used by profile query', () => {
    expect(MASTER_ANALYTICS_CLOSED_CAP).toBe(2000);
  });
});
