import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type CardVariant = 'default' | 'role-mint' | 'role-violet' | 'role-danger';

type CardProps = {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
};

type CardSectionProps = {
  className?: string;
  children: ReactNode;
};

function borderLeftForVariant(variant: CardVariant): string | undefined {
  if (variant === 'role-mint') return '4px solid var(--color-mint)';
  if (variant === 'role-violet') return '4px solid var(--color-violet)';
  if (variant === 'role-danger') return '4px solid var(--color-danger)';
  return undefined;
}

export default function Card({ variant = 'default', className, children }: CardProps) {
  return (
    <div
      className={cn(className)}
      style={{
        borderRadius: 14,
        border: '1px solid var(--color-line)',
        borderLeft: borderLeftForVariant(variant),
        background: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardSectionProps) {
  return (
    <div
      className={cn(className)}
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--color-line)',
      }}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children }: CardSectionProps) {
  return (
    <div className={cn(className)} style={{ padding: '20px 24px' }}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children }: CardSectionProps) {
  return (
    <div
      className={cn(className)}
      style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--color-line)',
        background: 'var(--color-surface-2)',
      }}
    >
      {children}
    </div>
  );
}
