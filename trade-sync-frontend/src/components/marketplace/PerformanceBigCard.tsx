import { ArrowRight } from "lucide-react";
import EquityCurve from "../charts/EquityCurve";
import { Button, Card, CardBody } from "../ui";
import type { MasterProfile } from "../../services/api";

type PerformanceBigCardProps = {
  profile: MasterProfile;
  copyLabel: string;
  copyDisabled?: boolean;
  copyHidden?: boolean;
  onCopy: () => void;
};

function money(value: number): string {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

export default function PerformanceBigCard({
  profile,
  copyLabel,
  copyDisabled = false,
  copyHidden = false,
  onCopy,
}: PerformanceBigCardProps) {
  const roi = profile.totalPnL;
  const roiColor = roi >= 0 ? "var(--color-mint)" : "var(--color-danger)";

  return (
    <Card>
      <CardBody>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--color-text-3)",
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          30-Day Performance
        </div>
        <div
          className="font-mono-tnum"
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: roiColor,
            letterSpacing: "-0.02em",
            margin: "8px 0 4px",
          }}
        >
          {roi >= 0 ? "+" : ""}
          {roi.toFixed(2)}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-3)" }}>
          Current backend uses lifetime closed PnL until 30-day ROI exists.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            background: "var(--color-line)",
            border: "1px solid var(--color-line)",
            borderRadius: 10,
            marginTop: 18,
            overflow: "hidden",
          }}
        >
          {[
            ["Win rate", `${profile.winRate}%`, "var(--color-text)"],
            ["Total trades", profile.totalTrades.toLocaleString(), "var(--color-text)"],
            ["Avg volume", profile.avgVolume.toFixed(2), "var(--color-text)"],
            ["Total PnL", money(profile.totalPnL), roiColor],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: "var(--color-surface)", padding: "14px 16px" }}>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--color-text-3)",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {label}
              </div>
              <div
                className="font-mono-tnum"
                style={{ fontSize: 18, fontWeight: 600, color, marginTop: 4 }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <EquityCurve height={220} accent={roiColor} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          {!copyHidden ? (
            <Button
              variant="primary"
              fullWidth
              disabled={copyDisabled}
              onClick={onCopy}
              rightIcon={<ArrowRight size={16} />}
            >
              {copyLabel}
            </Button>
          ) : null}
          <Button variant="ghost" fullWidth disabled title="Coming soon">
            Add to watchlist
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
