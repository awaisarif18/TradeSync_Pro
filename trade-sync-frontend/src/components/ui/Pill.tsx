import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type PillVariant =
  | 'default'
  | 'mint'
  | 'violet'
  | 'danger'
  | 'warn'
  | 'outline-mint'
  | 'outline-violet'
  | 'outline-danger'
  | 'outline-warn';

type PillProps = {
  variant?: PillVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

const VARIANT_STYLES: Record<PillVariant, CSSProperties> = {
  default: {
    background: 'var(--color-surface-2)',
    color: 'var(--color-text-2)',
    border: '1px solid var(--color-line)',
  },
  mint: {
    background: 'var(--color-mint-soft)',
    color: 'var(--color-mint)',
  },
  violet: {
    background: 'var(--color-violet-soft)',
    color: 'var(--color-violet)',
  },
  danger: {
    background: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
  },
  warn: {
    background: 'var(--color-warn-soft)',
    color: 'var(--color-warn)',
  },
  'outline-mint': {
    background: 'transparent',
    color: 'var(--color-mint)',
    border: '1px solid var(--color-mint)',
  },
  'outline-violet': {
    background: 'transparent',
    color: 'var(--color-violet)',
    border: '1px solid var(--color-violet)',
  },
  'outline-danger': {
    background: 'transparent',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
  },
  'outline-warn': {
    background: 'transparent',
    color: 'var(--color-warn)',
    border: '1px solid var(--color-warn)',
  },
};

export default function Pill({ variant = 'default', icon, children, className }: PillProps) {
  return (
    <span
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        borderRadius: 9999,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 500,
        ...VARIANT_STYLES[variant],
      }}
    >
      {icon}
      {children}
    </span>
  );
}
