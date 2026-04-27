import TradeRow, { type Trade } from '../feed/TradeRow';
import { Card, CardBody, Pill, StatusPill } from '../ui';

const TRADES: Trade[] = [
  { time: '14:22:08', side: 'BUY', sym: 'XAUUSD', who: 'Sasha Ng', qty: '0.50', px: '2,418.40', pnl: 0.42 },
  { time: '14:21:55', side: 'SELL', sym: 'EURUSD', who: 'Sasha Ng', qty: '1.00', px: '1.0843', pnl: 0.18 },
  { time: '14:21:31', side: 'BUY', sym: 'BTCUSDT', who: 'Marco Aurelio', qty: '0.12', px: '109,820', pnl: -0.24 },
  { time: '14:21:02', side: 'BUY', sym: 'NQ', who: 'Liu Chen', qty: '2', px: '23,184', pnl: 0.86 },
  { time: '14:20:48', side: 'SELL', sym: 'GBPUSD', who: 'Sasha Ng', qty: '0.75', px: '1.2715', pnl: 0.31 },
];

export default function LiveTradeFeedCard() {
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 80px' }}>
      <Card>
        <CardBody>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusPill status="live" label="Live trade feed" />
              <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                · streaming from providers across the network
              </span>
            </div>
            <Pill>
              <span className="font-mono-tnum">487</span> trades today
            </Pill>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr 90px 90px 60px',
              gap: 12,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              color: 'var(--color-text-3)',
              padding: '0 0 8px',
              borderBottom: '1px solid var(--color-line)',
            }}
          >
            <div>Time</div>
            <div>Order</div>
            <div style={{ textAlign: 'right' }}>Qty</div>
            <div style={{ textAlign: 'right' }}>Price</div>
            <div style={{ textAlign: 'right' }}>P&amp;L</div>
          </div>
          {TRADES.map((trade) => (
            <TradeRow key={`${trade.time}-${trade.sym}`} trade={trade} />
          ))}
        </CardBody>
      </Card>
    </section>
  );
}
