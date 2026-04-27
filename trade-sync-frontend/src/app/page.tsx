import MarketTicker from "../components/feed/MarketTicker";
import FooterStrip from "../components/marketing/FooterStrip";
import Hero from "../components/marketing/Hero";
import HowItWorks from "../components/marketing/HowItWorks";
import LiveTradeFeedCard from "../components/marketing/LiveTradeFeedCard";
import ProviderShowcase, { type TraderCardData } from "../components/marketing/ProviderShowcase";
import { StatusPill } from "../components/ui";

const mockProviders: TraderCardData[] = [
  {
    id: "sasha-ng",
    fullName: "Sasha Ng",
    handle: "sasha_fx",
    primaryAsset: "Forex · Gold",
    riskLevel: "MEDIUM",
    roi30d: 42.8,
    winRate: 71,
    subscriberCount: 1842,
    isLive: true,
    tradingPlatform: "Exness",
    typicalHoldTime: "Hours",
    strategyDescription: "Scalping",
    bio: "London-session FX with disciplined gold scalps.",
  },
  {
    id: "marco-aurelio",
    fullName: "Marco Aurelio",
    handle: "mrc_btc",
    primaryAsset: "Crypto",
    riskLevel: "HIGH",
    roi30d: 68.1,
    winRate: 64,
    subscriberCount: 3217,
    isLive: true,
    tradingPlatform: "Vantage",
    typicalHoldTime: "Days",
    strategyDescription: "Swing",
    bio: "BTC swing setups, no leverage games.",
  },
  {
    id: "liu-chen",
    fullName: "Liu Chen",
    handle: "liu_macro",
    primaryAsset: "Futures",
    riskLevel: "LOW",
    roi30d: 24.6,
    winRate: 78,
    subscriberCount: 5108,
    isLive: true,
    tradingPlatform: "IC Markets",
    typicalHoldTime: "Weeks",
    strategyDescription: "Macro",
    bio: "Macro futures only. Patient entries.",
  },
];

export default function Home() {
  return (
    <div style={{ minHeight: "100%" }}>
      <Hero />
      <MarketTicker />
      {/* TODO: Wire provider count from GET /auth/masters length; traders online and mirrored trades are not exposed by backend yet. */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 32px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 13,
            color: "var(--color-text-3)",
            flexWrap: "wrap",
          }}
        >
          <StatusPill status="live" label="1,284 traders online" mono />
          <span>·</span>
          <span>
            <span className="font-mono-tnum">247</span> verified providers
          </span>
          <span>·</span>
          <span>
            <span className="font-mono-tnum">487</span> trades mirrored today
          </span>
        </div>
      </div>
      <HowItWorks />
      {/* TODO: Replace with real fetch GET /auth/masters?limit=3 + per-master profile in Phase 5. */}
      <ProviderShowcase providers={mockProviders} />
      <LiveTradeFeedCard />
      <FooterStrip />
    </div>
  );
}
