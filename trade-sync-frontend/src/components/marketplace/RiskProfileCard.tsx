import { Card, CardBody, SectionEyebrow } from "../ui";

export default function RiskProfileCard() {
  // TODO: Replace mock risk metrics when backend exposes drawdown, streaks, and gain distributions.
  const rows = [
    ["Max drawdown", "-8.4%", "var(--color-danger)"],
    ["Avg trades/day", "3.1", "var(--color-text)"],
    ["Longest losing streak", "4 trades", "var(--color-text)"],
    ["Sharpest gain day", "+12.8%", "var(--color-mint)"],
  ];

  return (
    <Card>
      <CardBody>
        <SectionEyebrow>Risk profile</SectionEyebrow>
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
