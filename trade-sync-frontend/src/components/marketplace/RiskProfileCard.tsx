import type { MasterRiskMetrics } from "../../services/api";
import { Card, CardBody, SectionEyebrow } from "../ui";

type RiskProfileCardProps = {
  metrics?: MasterRiskMetrics | null;
};

function formatBestDayPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(pnl).toFixed(2)}`;
}

export default function RiskProfileCard({ metrics }: RiskProfileCardProps) {
  if (!metrics) {
    return (
      <Card>
        <CardBody>
          <SectionEyebrow>Risk profile</SectionEyebrow>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--color-text-2)", lineHeight: 1.5 }}>
            Not enough closed trades yet to show drawdown and streak stats.
          </p>
        </CardBody>
      </Card>
    );
  }

  const bestDayColor = metrics.bestDayPnl >= 0 ? "var(--color-mint)" : "var(--color-danger)";
  const rows: [string, string, string][] = [
    ["Max drawdown", `-${metrics.maxDrawdownPercent}%`, "var(--color-danger)"],
    ["Avg trades/day", String(metrics.avgTradesPerDay), "var(--color-text)"],
    ["Longest losing streak", `${metrics.longestLosingStreakTrades} trades`, "var(--color-text)"],
    ["Best day (P&L)", formatBestDayPnl(metrics.bestDayPnl), bestDayColor],
  ];

  return (
    <Card>
      <CardBody>
        <SectionEyebrow>Risk profile</SectionEyebrow>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--color-text-3)", lineHeight: 1.4 }}>
          From recent closed trades (capped sample on server).
        </p>
        <div style={{ marginTop: 6 }}>
          {rows.map(([label, value, color], index) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "10px 0",
                borderBottom: index < rows.length - 1 ? "1px solid var(--color-line)" : "none",
              }}
            >
              <div style={{ fontSize: 13, color: "var(--color-text-2)" }}>{label}</div>
              <div className="font-mono-tnum" style={{ fontSize: 14, fontWeight: 600, color }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
