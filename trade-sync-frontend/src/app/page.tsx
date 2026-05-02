import MarketTicker from "../components/feed/MarketTicker";
import ContactSection from "../components/marketing/ContactSection";
import FooterStrip from "../components/marketing/FooterStrip";
import Hero from "../components/marketing/Hero";
import LiveTradeFeedCard, {
  type TradeHistoryItem,
} from "../components/marketing/LiveTradeFeedCard";
import VerifiedProviderShowcaseBlock from "../components/marketing/VerifiedProviderShowcaseBlock";

const BACKEND_ORIGIN = "http://localhost:3000";

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = raw[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function pickNum(raw: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function pickDateIso(raw: Record<string, unknown>): string {
  const v =
    raw.createdAt ??
    raw.CreatedAt ??
    raw.SignalTimestamp ??
    raw.signalTimestamp;
  if (typeof v === "string" && v) return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number" && Number.isFinite(v)) {
    return new Date(v).toISOString();
  }
  return new Date().toISOString();
}

function normalizeHistoryRow(
  raw: Record<string, unknown>,
  index: number,
): TradeHistoryItem | null {
  const symbol = pickStr(raw, "symbol", "Symbol");
  const action = pickStr(raw, "action", "Action", "ActionType").toUpperCase();
  const status = pickStr(raw, "status", "Status").toUpperCase();

  // STRICT FILTER: Only show closed trades with a valid opening action
  if (status !== "CLOSED") return null;
  if (action !== "BUY" && action !== "SELL") return null;
  if (!symbol) return null;

  const id = pickStr(raw, "id", "Id", "ID") || `trade-${symbol}-${index}`;

  // Extract nested master name from TypeORM relation if present
  let masterName = pickStr(raw, "masterName", "MasterName", "masterFullName");
  if (!masterName && raw.master && typeof raw.master === "object") {
    masterName = pickStr(raw.master as Record<string, unknown>, "fullName", "name");
  }
  masterName = masterName || "Provider";

  const volume = pickNum(raw, "volume", "Volume") ?? 0;
  const rawPnl = pickNum(raw, "pnl", "PnL", "PNL");

  return {
    id,
    masterName,
    symbol,
    action,
    volume,
    pnl: rawPnl,
    status,
    createdAt: pickDateIso(raw),
  };
}

async function fetchRecentTrades(): Promise<TradeHistoryItem[]> {
  let recentTrades: TradeHistoryItem[] = [];
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/trades/history`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const all: unknown = await res.json();
      if (Array.isArray(all)) {
        recentTrades = all
          .map((row, i) =>
            typeof row === "object" &&
            row !== null &&
            !Array.isArray(row)
              ? normalizeHistoryRow(row as Record<string, unknown>, i)
              : null,
          )
          .filter((x): x is TradeHistoryItem => x !== null)
          .slice(0, 5);
      }
    }
  } catch {
    recentTrades = [];
  }
  return recentTrades;
}

export default async function Home() {
  const recentTrades = await fetchRecentTrades();

  return (
    <div style={{ minHeight: "100%" }}>
      <Hero />
      <MarketTicker />
      <VerifiedProviderShowcaseBlock />
      <LiveTradeFeedCard trades={recentTrades} />
      <ContactSection />
      <FooterStrip />
    </div>
  );
}
