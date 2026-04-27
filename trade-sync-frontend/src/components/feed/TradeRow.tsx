export interface Trade {
  time: string;
  side: 'BUY' | 'SELL';
  sym: string;
  who?: string;
  qty: string | number;
  px: string | number;
  pnl: number;
}

type TradeRowProps = {
  trade: Trade;
  columns?: 'standard' | 'compact';
};

export default function TradeRow({ trade, columns = 'standard' }: TradeRowProps) {
  const compact = columns === 'compact';
  const sideColor = trade.side === 'BUY' ? 'var(--color-mint)' : 'var(--color-danger)';
  const sideBackground =
    trade.side === 'BUY' ? 'var(--color-mint-soft)' : 'var(--color-danger-soft)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '70px 1fr 90px 90px 60px',
        gap: 12,
        alignItems: 'center',
        padding: compact ? '8px 0' : '10px 0',
        borderBottom: '1px solid var(--color-line)',
        fontSize: compact ? 12 : 13,
      }}
    >
      <div className="font-mono-tnum" style={{ color: 'var(--color-text-3)' }}>
        {trade.time}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
            background: sideBackground,
            color: sideColor,
          }}
        >
          {trade.side}
        </span>
        <span style={{ fontWeight: 500 }}>{trade.sym}</span>
        {trade.who ? (
          <span style={{ color: 'var(--color-text-3)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            · {trade.who}
          </span>
        ) : null}
      </div>
      <div className="font-mono-tnum" style={{ textAlign: 'right' }}>
        {trade.qty}
      </div>
      <div className="font-mono-tnum" style={{ textAlign: 'right' }}>
        ${trade.px}
      </div>
      <div
        className="font-mono-tnum"
        style={{
          textAlign: 'right',
          color: trade.pnl >= 0 ? 'var(--color-mint)' : 'var(--color-danger)',
        }}
      >
        {trade.pnl >= 0 ? '+' : ''}
        {trade.pnl}%
      </div>
    </div>
  );
}
