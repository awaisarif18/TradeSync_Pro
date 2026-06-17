import { Download } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";
import type { DesktopAppDownload } from "@/lib/downloads";

type DownloadCardProps = {
  app: DesktopAppDownload;
};

export default function DownloadCard({ app }: DownloadCardProps) {
  return (
    <Card>
      <CardBody>
        <p
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            color: "var(--color-mint)",
            margin: "0 0 8px",
            fontWeight: 600,
          }}
        >
          {app.roleLabel}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 10px" }}>
          {app.title}
        </h2>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--color-text-2)",
            margin: "0 0 16px",
          }}
        >
          {app.description}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-3)",
            margin: "0 0 20px",
          }}
        >
          Windows · MetaTrader 5 required
        </p>
        <a
          href={app.url}
          download
          style={{ textDecoration: "none", display: "inline-block" }}
        >
          <Button leftIcon={<Download size={15} />}>Download for Windows</Button>
        </a>
      </CardBody>
    </Card>
  );
}
