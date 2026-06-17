import type { Metadata } from "next";
import DownloadCard from "@/components/downloads/DownloadCard";
import { SectionEyebrow } from "@/components/ui";
import { COPIER_DOWNLOAD, PROVIDER_DOWNLOAD } from "@/lib/downloads";

export const metadata: Metadata = {
  title: "Downloads | TradeSync Pro",
  description:
    "Download the TradeSync Pro Provider and Copier desktop apps for Windows and MetaTrader 5.",
};

export default function DownloadsPage() {
  return (
    <div style={{ padding: "32px 0 80px" }}>
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px 40px" }}>
        <SectionEyebrow color="mint">Desktop apps</SectionEyebrow>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            margin: "10px 0 12px",
          }}
        >
          Download TradeSync Pro
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--color-text-2)",
            lineHeight: 1.5,
            margin: 0,
            maxWidth: 560,
          }}
        >
          Install the Windows desktop app for your role. Both apps require MetaTrader 5
          and connect your terminal to TradeSync Pro.
        </p>
      </section>

      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          <DownloadCard app={PROVIDER_DOWNLOAD} />
          <DownloadCard app={COPIER_DOWNLOAD} />
        </div>
      </section>
    </div>
  );
}
