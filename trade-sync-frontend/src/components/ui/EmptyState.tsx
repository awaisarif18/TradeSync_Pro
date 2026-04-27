import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      {icon ? (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--color-surface-2)',
            color: 'var(--color-text-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      ) : null}
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--color-text)',
        }}
      >
        {title}
      </div>
      {description ? (
        <div
          style={{
            fontSize: 14,
            color: 'var(--color-text-2)',
            maxWidth: 320,
          }}
        >
          {description}
        </div>
      ) : null}
      {action}
    </div>
  );
}
