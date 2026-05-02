import { Card, CardBody, Pill, StatusPill } from "../ui";

export interface TradeHistoryItem {
  id: string;
  masterName: string;
  symbol: string;
  action: string;
  volume: number;
  pnl: number | null;
  status: string;
  createdAt: string;
}

const FALLBACK_TRADES: TradeHistoryItem[] = [
  {
    id: "1",
    masterName: "Sasha Ng",
    symbol: "XAUUSD",
    action: "BUY",
    volume: 0.5,
    pnl: 0.42,
    createdAt: new Date().toISOString(),
    status: "CLOSED",
  },
  {
    id: "2",
    masterName: "Sasha Ng",
    symbol: "EURUSD",
    action: "SELL",
    volume: 1.0,
    pnl: 0.18,
    createdAt: new Date().toISOString(),
    status: "CLOSED",
  },
  {
    id: "3",
    masterName: "Marco Aurelio",
    symbol: "BTCUSDT",
    action: "BUY",
    volume: 0.12,
    pnl: -0.24,
    createdAt: new Date().toISOString(),
    status: "CLOSED",
  },
  {
    id: "4",
    masterName: "Liu Chen",
    symbol: "NQ",
    action: "BUY",
    volume: 2,
    pnl: 0.86,
    createdAt: new Date().toISOString(),
    status: "CLOSED",
  },
  {
    id: "5",
    masterName: "Sasha Ng",
    symbol: "GBPUSD",
    action: "SELL",
    volume: 0.75,
    pnl: 0.31,
    createdAt: new Date().toISOString(),
    status: "CLOSED",
  },
];

function formatTimeHHMMSS(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function FeedTradeRow({ trade }: { trade: TradeHistoryItem }) {
  const actionUpper = trade.action.trim().toUpperCase();
  const isSell = actionUpper === "SELL";
  const isBuy = actionUpper === "BUY";
  const sideColor = isSell
    ? "var(--color-danger)"
    : isBuy
      ? "var(--color-mint)"
      : "var(--color-text-2)";
  const sideBackground = isSell
    ? "var(--color-danger-soft)"
    : isBuy
      ? "var(--color-mint-soft)"
      : "var(--color-surface-2)";
  const chipLabel = actionUpper.slice(0, 6) || "—";

  const pnlDisplay =
    trade.pnl !== null && typeof trade.pnl === "number" ? (
      <span
        className="font-mono-tnum"
        style={{
          textAlign: "right",
          color: trade.pnl >= 0 ? "var(--color-mint)" : "var(--color-danger)",
        }}
      >
        {trade.pnl >= 0 ? "+$" : "-$"}
        {Math.abs(trade.pnl).toFixed(2)}
      </span>
    ) : (
      <span
        className="font-mono-tnum"
        style={{ textAlign: "right", color: "var(--color-text-3)" }}
      >
        —
      </span>
    );

  // Hide generic "Provider" text to keep it clean like the dashboard
  const displayMaster =
    trade.masterName === "Provider" ? "" : ` · ${trade.masterName}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr 80px 80px 90px 80px",
        gap: 12,
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--color-line)",
        fontSize: 13,
      }}
    >
      <div className="font-mono-tnum" style={{ color: "var(--color-text-3)" }}>
        {formatTimeHHMMSS(trade.createdAt)}
      </div>

      <div
        style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
      >
        <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
          {trade.symbol}
        </span>
        {displayMaster ? (
          <span
            style={{
              color: "var(--color-text-3)",
              fontSize: 12,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayMaster}
          </span>
        ) : null}
      </div>

      <div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: 4,
            background: sideBackground,
            color: sideColor,
          }}
        >
          {chipLabel}
        </span>
      </div>

      <div className="font-mono-tnum" style={{ textAlign: "right" }}>
        {Number(trade.volume).toFixed(2)}
      </div>

      {pnlDisplay}

      <div style={{ textAlign: "right" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--color-text-3)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          {trade.status || "CLOSED"}
        </span>
      </div>
    </div>
  );
}

type LiveTradeFeedCardProps = {
  trades: TradeHistoryItem[];
};

export default function LiveTradeFeedCard({ trades }: LiveTradeFeedCardProps) {
  const displayTrades =
    trades.length > 0 ? trades.slice(0, 5) : FALLBACK_TRADES;

  return (
    <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px 80px" }}>
      <Card>
        <CardBody>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StatusPill status="live" label="Live trade feed" />
              <span style={{ fontSize: 12, color: "var(--color-text-3)" }}>
                · streaming from providers across the network
              </span>
            </div>
            <Pill>
              <span className="font-mono-tnum">487</span> trades today
            </Pill>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 80px 80px 90px 80px",
              gap: 12,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              color: "var(--color-text-3)",
              padding: "0 0 8px",
              borderBottom: "1px solid var(--color-line)",
            }}
          >
            <div>Time</div>
            <div>Symbol</div>
            <div>Action</div>
            <div style={{ textAlign: "right" }}>Volume</div>
            <div style={{ textAlign: "right" }}>P&amp;L</div>
            <div style={{ textAlign: "right" }}>Status</div>
          </div>
          {displayTrades.map((trade) => (
            <FeedTradeRow key={trade.id} trade={trade} />
          ))}
        </CardBody>
      </Card>
    </section>
  );
}
