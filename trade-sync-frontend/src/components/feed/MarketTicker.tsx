type MarketTickerItem = {
  symbol: string;
  price: number;
  change: number;
};

type MarketTickerProps = {
  items?: MarketTickerItem[];
};

const DEFAULT_ITEMS: MarketTickerItem[] = [
  { symbol: 'BTC', price: 109842.5, change: 2.14 },
  { symbol: 'ETH', price: 4127.88, change: 1.42 },
  { symbol: 'EUR/USD', price: 1.0842, change: -0.18 },
  { symbol: 'XAU', price: 2418.1, change: 0.62 },
  { symbol: 'NQ', price: 23184.5, change: 0.94 },
  { symbol: 'SOL', price: 247.31, change: 3.82 },
  { symbol: 'GBP/USD', price: 1.2715, change: -0.24 },
  { symbol: 'WTI', price: 71.42, change: -1.1 },
];

export default function MarketTicker({ items = DEFAULT_ITEMS }: MarketTickerProps) {
  const repeatedItems = [...items, ...items, ...items];

  return (
    <div
      style={{
        borderTop: '1px solid var(--color-line)',
        borderBottom: '1px solid var(--color-line)',
        overflow: 'hidden',
        position: 'relative',
        background: 'rgba(255,255,255,0.015)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 36,
          padding: '12px 0',
          animation: 'a-scroll 50s linear infinite',
          whiteSpace: 'nowrap',
          width: 'max-content',
        }}
      >
        {repeatedItems.map((item, index) => (
          <div
            key={`${item.symbol}-${index}`}
            style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, fontSize: 13 }}
          >
            <span style={{ color: 'var(--color-text-2)', fontWeight: 500 }}>{item.symbol}</span>
            <span className="font-mono-tnum" style={{ color: 'var(--color-text)' }}>
              {item.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
            <span
              className="font-mono-tnum"
              style={{
                color: item.change >= 0 ? 'var(--color-mint)' : 'var(--color-danger)',
                fontSize: 12,
              }}
            >
              {item.change >= 0 ? '+' : ''}
              {item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
