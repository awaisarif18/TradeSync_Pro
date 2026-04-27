import Link from 'next/link';
import { ArrowRight, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import EquityCurve from '../charts/EquityCurve';
import TradeRow, { type Trade } from '../feed/TradeRow';
import { Button, Card, CardBody, Pill, StatusPill } from '../ui';

const TRADES: Trade[] = [
  { time: '14:22:08', side: 'BUY', sym: 'XAUUSD', who: 'Sasha Ng', qty: '0.50', px: '2,418.40', pnl: 0.42 },
  { time: '14:21:55', side: 'SELL', sym: 'EURUSD', who: 'Sasha Ng', qty: '1.00', px: '1.0843', pnl: 0.18 },
  { time: '14:21:31', side: 'BUY', sym: 'BTCUSDT', who: 'Marco Aurelio', qty: '0.12', px: '109,820', pnl: -0.24 },
];

export default function Hero() {
  return (
    <section
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '64px 32px 24px',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: 48,
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ marginBottom: 24 }}>
          <Pill variant="outline-mint">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--color-mint)' }} />
            MT5 bridge · sub-second sync
          </Pill>
        </div>
        <h1
          style={{
            fontSize: 64,
            lineHeight: 1.02,
            fontWeight: 600,
            letterSpacing: '-0.035em',
            margin: 0,
          }}
        >
          Mirror the world&apos;s
          <br />
          best traders, in
          <br />
          <span style={{ color: 'var(--color-mint)' }}>milliseconds.</span>
        </h1>
        <p
          style={{
            fontSize: 17,
            color: 'var(--color-text-2)',
            lineHeight: 1.5,
            marginTop: 24,
            maxWidth: 460,
          }}
        >
          TradeSync Pro bridges your MT5 terminal directly to verified providers. Every fill,
          stop, and partial close is replicated on your account, on the same tick.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
              Start copying free
            </Button>
          </Link>
          <Link href="/register?role=master" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="lg">Become a provider</Button>
          </Link>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 28,
            marginTop: 36,
            fontSize: 13,
            color: 'var(--color-text-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} /> Regulated · KYC verified
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LinkIcon size={18} /> Direct MT5 bridge
          </div>
        </div>
      </div>

      <Card>
        <CardBody>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Portfolio · live</div>
                <div className="font-mono-tnum" style={{ fontSize: 26, fontWeight: 600, marginTop: 2 }}>
                  $48,217.<span style={{ color: 'var(--color-text-3)' }}>04</span>
                </div>
                <div className="font-mono-tnum" style={{ fontSize: 13, color: 'var(--color-mint)', marginTop: 2 }}>
                  +$2,184.50 · +4.74% today
                </div>
              </div>
              <StatusPill status="live" />
            </div>
            <EquityCurve height={180} />
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-line)' }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  color: 'var(--color-text-3)',
                  letterSpacing: 0.6,
                  marginBottom: 8,
                }}
              >
                Mirroring · <span className="font-mono-tnum">3</span> providers
              </div>
              {TRADES.map((trade) => (
                <TradeRow key={`${trade.time}-${trade.sym}`} trade={trade} columns="compact" />
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
