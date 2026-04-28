import MarketTicker from "../components/feed/MarketTicker";
import FooterStrip from "../components/marketing/FooterStrip";
import Hero from "../components/marketing/Hero";
import LiveTradeFeedCard from "../components/marketing/LiveTradeFeedCard";
import VerifiedProviderShowcaseBlock from "../components/marketing/VerifiedProviderShowcaseBlock";

export default function Home() {
  return (
    <div style={{ minHeight: "100%" }}>
      <Hero />
      <MarketTicker />
      <VerifiedProviderShowcaseBlock />
      <LiveTradeFeedCard />
      <FooterStrip />
    </div>
  );
}
