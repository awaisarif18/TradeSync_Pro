import { Card, CardBody, SectionEyebrow } from "../ui";

export default function TradingHoursCard() {
  return (
    <Card>
      <CardBody>
        <SectionEyebrow>Trading hours</SectionEyebrow>
        {/* TODO: Trading hours are decorative until backend stores provider sessions. */}
        <div style={{ fontSize: 14, color: "var(--color-text)", lineHeight: 1.5, marginTop: 10 }}>
          London + NY overlap
        </div>
        <div className="font-mono-tnum" style={{ fontSize: 12, color: "var(--color-text-3)", marginTop: 4 }}>
          12:00-17:00 GMT
        </div>
      </CardBody>
    </Card>
  );
}
