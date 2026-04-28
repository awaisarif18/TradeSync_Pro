import { Card, CardBody, SectionEyebrow } from "../ui";

type TradingHoursCardProps = {
  summary?: string | null;
};

export default function TradingHoursCard({ summary }: TradingHoursCardProps) {
  const hasSummary = Boolean(summary && summary.trim());

  return (
    <Card>
      <CardBody>
        <SectionEyebrow>Trading hours</SectionEyebrow>
        {hasSummary ? (
          <>
            <div style={{ fontSize: 14, color: "var(--color-text)", lineHeight: 1.5, marginTop: 10 }}>
              {summary}
            </div>
            <div className="font-mono-tnum" style={{ fontSize: 12, color: "var(--color-text-3)", marginTop: 6 }}>
              From recent trade activity (UTC)
            </div>
          </>
        ) : (
          <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--color-text-2)", lineHeight: 1.5 }}>
            No activity pattern yet from closed trades.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
