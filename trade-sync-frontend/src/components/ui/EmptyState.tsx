import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type EmptyStateProps = {
  icon?: ReactNode;
  iconFrame?: boolean;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  icon,
  iconFrame = true,
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
            width: iconFrame ? 48 : undefined,
            height: iconFrame ? 48 : undefined,
            borderRadius: iconFrame ? '50%' : undefined,
            background: iconFrame ? 'var(--color-surface-2)' : undefined,
            color: iconFrame ? 'var(--color-text-3)' : undefined,
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
