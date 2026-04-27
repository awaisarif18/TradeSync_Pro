type StatusPillProps = {
  status: 'live' | 'idle' | 'broadcasting' | 'listening' | 'not-subscribed' | 'disconnected';
  label?: string;
  mono?: boolean;
};

const LABELS: Record<StatusPillProps['status'], string> = {
  live: 'Live',
  idle: 'Idle',
  broadcasting: 'Broadcasting',
  listening: 'Listening',
  'not-subscribed': 'Not subscribed',
  disconnected: 'Disconnected',
};

const ACTIVE_STATUSES = ['live', 'broadcasting', 'listening'];
const IDLE_STATUSES = ['idle', 'not-subscribed'];

export default function StatusPill({ status, label, mono = false }: StatusPillProps) {
  const isActive = ACTIVE_STATUSES.includes(status);
  const isIdle = IDLE_STATUSES.includes(status);
  const color = isActive
    ? 'var(--color-mint)'
    : isIdle
      ? 'var(--color-text-3)'
      : 'var(--color-danger)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 9999,
        padding: '4px 10px',
        fontSize: 12,
        background: isActive
          ? 'var(--color-mint-soft)'
          : isIdle
            ? 'var(--color-surface-2)'
            : 'var(--color-danger-soft)',
        color,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isIdle ? 'transparent' : color,
          border: isIdle ? '1.5px solid var(--color-text-3)' : undefined,
          animation: isActive ? 'a-pulse 1.5s infinite' : undefined,
        }}
      />
      <span className={mono ? 'font-mono-tnum' : undefined}>{label ?? LABELS[status]}</span>
    </span>
  );
}
