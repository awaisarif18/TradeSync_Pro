import { Card, CardBody, Pill, SectionEyebrow } from "../ui";

type InstrumentsCardProps = {
  instruments: string | null;
};

export default function InstrumentsCard({ instruments }: InstrumentsCardProps) {
  const items = instruments
    ? instruments
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return (
    <Card>
      <CardBody>
        <SectionEyebrow>Instruments</SectionEyebrow>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
          {items.length > 0 ? (
            items.map((instrument) => (
              <Pill key={instrument} variant="outline-mint">
                <span className="font-mono-tnum">{instrument}</span>
              </Pill>
            ))
          ) : (
            <span style={{ color: "var(--color-text-3)", fontSize: 14 }}>
              No instruments listed yet.
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
