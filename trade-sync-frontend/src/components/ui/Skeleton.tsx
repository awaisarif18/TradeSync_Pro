import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';

type SkeletonProps = {
  variant?: 'line' | 'rect' | 'circle';
  width?: number | string;
  height?: number | string;
  className?: string;
};

function sizeValue(value: number | string | undefined): number | string | undefined {
  return typeof value === 'number' ? `${value}px` : value;
}

export default function Skeleton({
  variant = 'line',
  width,
  height,
  className,
}: SkeletonProps) {
  const resolvedWidth = sizeValue(width) ?? '100%';
  const resolvedHeight = sizeValue(height);
  const circleSize = resolvedWidth;

  const variantStyle: CSSProperties =
    variant === 'circle'
      ? {
          borderRadius: '50%',
          width: circleSize,
          height: resolvedHeight ?? circleSize,
        }
      : variant === 'rect'
        ? {
            borderRadius: 10,
            width: resolvedWidth,
            height: resolvedHeight ?? 80,
          }
        : {
            borderRadius: 4,
            width: resolvedWidth,
            height: resolvedHeight ?? 14,
          };

  return (
    <>
      <style>
        {`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}
      </style>
      <div
        className={cn(className)}
        style={{
          background:
            'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-2) 50%, var(--color-surface) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          ...variantStyle,
        }}
      />
    </>
  );
}
