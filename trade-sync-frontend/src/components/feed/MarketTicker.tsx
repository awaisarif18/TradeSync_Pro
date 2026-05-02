"use client";

import { useCallback, useEffect, useState } from "react";

type TickerItem = {
  symbol: string;
  price: number;
  change24h: number;
  isLive: boolean;
};

type CoingeckoResponse = {
  bitcoin?: { usd?: number; usd_24h_change?: number | null };
  ethereum?: { usd?: number; usd_24h_change?: number | null };
  solana?: { usd?: number; usd_24h_change?: number | null };
  ripple?: { usd?: number; usd_24h_change?: number | null };
  cardano?: { usd?: number; usd_24h_change?: number | null };
  dogecoin?: { usd?: number; usd_24h_change?: number | null };
};

type FrankfurterResponse = {
  rates?: { EUR?: number; GBP?: number };
};

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,cardano,dogecoin&vs_currencies=usd&include_24hr_change=true";

const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP";

/** Initial / offline fallbacks; crypto & FX update when APIs succeed */
const INITIAL_ITEMS: TickerItem[] = [
  { symbol: "BTC", price: 109_842.5, change24h: 0, isLive: true },
  { symbol: "ETH", price: 4127.88, change24h: 0, isLive: true },
  { symbol: "EUR/USD", price: 1.0842, change24h: 0, isLive: true },
  { symbol: "XRP", price: 0.5, change24h: 0, isLive: true },
  { symbol: "ADA", price: 0.4, change24h: 0, isLive: true },
  { symbol: "SOL", price: 247.31, change24h: 0, isLive: true },
  { symbol: "GBP/USD", price: 1.2715, change24h: 0, isLive: true },
  { symbol: "DOGE", price: 0.15, change24h: 0, isLive: true },
];

export default function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>(INITIAL_ITEMS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [liveDataStale, setLiveDataStale] = useState(false);

  const fetchPrices = useCallback(async () => {
    const [cgResult, fxResult] = await Promise.allSettled([
      fetch(COINGECKO_URL, { cache: "no-store" }).then((res) => {
        if (!res.ok) throw new Error("coingecko");
        return res.json() as Promise<CoingeckoResponse>;
      }),
      fetch(FRANKFURTER_URL, { cache: "no-store" }).then((res) => {
        if (!res.ok) throw new Error("frankfurter");
        return res.json() as Promise<FrankfurterResponse>;
      }),
    ]);

    const cgOk = cgResult.status === "fulfilled";
    const fxOk = fxResult.status === "fulfilled";
    setLiveDataStale(!cgOk || !fxOk);

    setItems((prev) => {
      const next = prev.map((item) => ({ ...item }));

      if (cgOk) {
        const d = cgResult.value;
        const patch = (
          row:
            | { usd?: number; usd_24h_change?: number | null }
            | undefined,
          symbol: string,
        ) => {
          if (!row || typeof row.usd !== "number") return;
          const i = next.findIndex((x) => x.symbol === symbol);
          if (i < 0) return;
          const ch =
            typeof row.usd_24h_change === "number" ? row.usd_24h_change : 0;
          next[i] = { symbol, price: row.usd, change24h: ch, isLive: true };
        };
        patch(d.bitcoin, "BTC");
        patch(d.ethereum, "ETH");
        patch(d.solana, "SOL");
        patch(d.ripple, "XRP");
        patch(d.cardano, "ADA");
        patch(d.dogecoin, "DOGE");
      }

      if (fxOk) {
        const data = fxResult.value;
        const eur = data.rates?.EUR;
        const gbp = data.rates?.GBP;
        if (typeof eur === "number" && eur > 0) {
          const i = next.findIndex((x) => x.symbol === "EUR/USD");
          if (i >= 0) {
            next[i] = {
              symbol: "EUR/USD",
              price: 1 / eur,
              change24h: 0,
              isLive: true,
            };
          }
        }
        if (typeof gbp === "number" && gbp > 0) {
          const i = next.findIndex((x) => x.symbol === "GBP/USD");
          if (i >= 0) {
            next[i] = {
              symbol: "GBP/USD",
              price: 1 / gbp,
              change24h: 0,
              isLive: true,
            };
          }
        }
      }

      return next;
    });

    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    void fetchPrices();
    const id = window.setInterval(() => {
      void fetchPrices();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [fetchPrices]);

  const repeatedItems = [...items, ...items, ...items];

  return (
    <div>
      <div
        style={{
          borderTop: "1px solid var(--color-line)",
          borderBottom: "1px solid var(--color-line)",
          overflow: "hidden",
          position: "relative",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 36,
            padding: "12px 0",
            animation: "a-scroll 50s linear infinite",
            whiteSpace: "nowrap",
            width: "max-content",
          }}
        >
          {repeatedItems.map((item, index) => {
            const label = item.isLive ? item.symbol : `${item.symbol}*`;
            return (
              <div
                key={`${item.symbol}-${index}`}
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <span
                  style={{ color: "var(--color-text-2)", fontWeight: 500 }}
                >
                  {label}
                </span>
                <span
                  className="font-mono-tnum"
                  style={{ color: "var(--color-text)" }}
                >
                  {item.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
                <span
                  className="font-mono-tnum"
                  style={{
                    color:
                      item.change24h >= 0
                        ? "var(--color-mint)"
                        : "var(--color-danger)",
                    fontSize: 12,
                  }}
                >
                  {item.change24h >= 0 ? "+" : ""}
                  {item.change24h.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p
        style={{
          margin: 0,
          padding: "4px 16px 8px",
          fontSize: 10,
          color: "var(--color-text-3)",
          textAlign: "center",
        }}
      >
        * live quotes update every 60 seconds
        {liveDataStale && lastUpdated
          ? " · live quotes may be stale until the next successful refresh"
          : ""}
      </p>
    </div>
  );
}
