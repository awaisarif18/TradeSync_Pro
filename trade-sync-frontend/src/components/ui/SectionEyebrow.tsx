import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type SectionEyebrowProps = {
  children: ReactNode;
  color?: 'default' | 'mint' | 'violet' | 'danger';
  className?: string;
};

const COLORS: Record<NonNullable<SectionEyebrowProps['color']>, string> = {
  default: 'var(--color-text-3)',
  mint: 'var(--color-mint)',
  violet: 'var(--color-violet)',
  danger: 'var(--color-danger)',
};

export default function SectionEyebrow({
  children,
  color = 'default',
  className,
}: SectionEyebrowProps) {
  return (
    <div
      className={cn(className)}
      style={{
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 500,
        color: COLORS[color],
      }}
    >
      {children}
    </div>
  );
}
