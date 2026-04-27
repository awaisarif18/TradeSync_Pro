import { BadgeCheck } from 'lucide-react';
import EquityCurve from '../charts/EquityCurve';
import { Avatar, Button, Card, CardBody, Pill, StatusPill } from '../ui';

export interface TraderCardData {
  id: string;
  fullName: string;
  handle?: string;
  email?: string;
  primaryAsset?: string;
  instruments?: string | string[] | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  roi30d?: number;
  winRate: number;
  subscriberCount: number;
  isLive: boolean;
  tradingPlatform?: string | null;
  typicalHoldTime?: string | null;
  strategyDescription?: string | null;
  bio?: string | null;
}

type TraderCardProps = {
  trader: TraderCardData;
  mode: 'marketplace' | 'showcase' | 'subscribed' | 'preview';
  onAction?: () => void;
  actionLabel?: string;
  actionVariant?: 'primary' | 'ghost' | 'ghost-mint' | 'ghost-danger' | 'ghost-violet';
};

function displayHandle(trader: TraderCardData): string {
  if (trader.handle) return trader.handle;
  if (trader.email) return trader.email.split('@')[0];
  return trader.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function displayAsset(trader: TraderCardData): string {
  if (trader.primaryAsset) return trader.primaryAsset;
  if (Array.isArray(trader.instruments) && trader.instruments.length > 0) return trader.instruments[0];
  if (typeof trader.instruments === 'string' && trader.instruments.trim()) {
    return trader.instruments.split(',')[0].trim();
  }
  return 'Multi-asset';
}

function riskVariant(riskLevel: TraderCardData['riskLevel']): 'outline-mint' | 'outline-warn' | 'outline-danger' {
  if (riskLevel === 'LOW') return 'outline-mint';
  if (riskLevel === 'MEDIUM') return 'outline-warn';
  return 'outline-danger';
}

function riskLabel(riskLevel: TraderCardData['riskLevel']): string {
  if (riskLevel === 'LOW') return 'Low risk';
  if (riskLevel === 'MEDIUM') return 'Medium risk';
  return 'High risk';
}

function defaultActionLabel(mode: TraderCardProps['mode'], empty: boolean): string {
  if (empty) return 'Profile incomplete';
  if (mode === 'showcase') return 'Copy trader';
  return 'View profile';
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--color-text-3)',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {label}
      </div>
      <div
        className="font-mono-tnum"
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: color ?? 'var(--color-text)',
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function TraderCard({
  trader,
  mode,
  onAction,
  actionLabel,
  actionVariant = 'ghost',
}: TraderCardProps) {
  const empty =
    trader.bio == null && trader.tradingPlatform == null && trader.strategyDescription == null;
  const curveAccent =
    trader.roi30d == null || trader.roi30d >= 0 ? 'var(--color-mint)' : 'var(--color-danger)';
  const metadata = [
    trader.tradingPlatform ? `Platform ${trader.tradingPlatform}` : null,
    trader.typicalHoldTime ? `Hold ${trader.typicalHoldTime}` : null,
    trader.strategyDescription ? `Strategy ${trader.strategyDescription}` : null,
  ].filter(Boolean);
  const showButton = mode !== 'preview';
  const resolvedActionLabel = actionLabel ?? defaultActionLabel(mode, empty);

  return (
    <Card className={undefined}>
      <CardBody>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            opacity: empty ? 0.7 : 1,
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: -4, right: 0 }}>
            {mode === 'subscribed' ? (
              <Pill variant="violet">
                <span className="font-mono-tnum">●</span> Subscribed
              </Pill>
            ) : (
              <StatusPill status={trader.isLive ? 'live' : 'idle'} label="" />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 68 }}>
            <Avatar name={trader.fullName} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {trader.fullName}
                </div>
                {!empty ? (
                  <span style={{ color: 'var(--color-mint)', display: 'flex' }}>
                    <BadgeCheck size={13} strokeWidth={2.6} />
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {empty ? '—' : `@${displayHandle(trader)} · ${displayAsset(trader)}`}
              </div>
            </div>
            {!empty ? <Pill variant={riskVariant(trader.riskLevel)}>{riskLabel(trader.riskLevel)}</Pill> : null}
          </div>

          <div style={{ height: 64, margin: '0 -4px', opacity: empty ? 0.3 : 1 }}>
            <EquityCurve width={300} height={64} accent={curveAccent} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Stat
              label="30d ROI"
              value={empty || trader.roi30d == null ? '—' : `${trader.roi30d >= 0 ? '+' : ''}${trader.roi30d}%`}
              color={empty || trader.roi30d == null ? 'var(--color-text-3)' : curveAccent}
            />
            <Stat label="Win rate" value={empty ? '—' : `${trader.winRate}%`} />
            <Stat
              label="Copiers"
              value={empty ? '—' : trader.subscriberCount.toLocaleString()}
            />
          </div>

          {metadata.length > 0 && !empty ? (
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {metadata.join(' · ')}
            </div>
          ) : null}

          <div
            style={{
              fontSize: 13,
              color: 'var(--color-text-2)',
              fontStyle: 'italic',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {empty ? "This provider hasn't set up their profile yet" : trader.bio}
          </div>

          {showButton ? (
            <Button
              variant={actionVariant}
              fullWidth
              size="sm"
              disabled={empty}
              onClick={onAction}
            >
              {resolvedActionLabel}
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
