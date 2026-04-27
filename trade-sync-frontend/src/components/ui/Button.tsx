'use client';

import { Loader2 } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'ghost' | 'ghost-mint' | 'ghost-danger' | 'ghost-violet';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
};

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--color-mint)',
    color: '#02110b',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid var(--color-line-2)',
    color: 'var(--color-text)',
  },
  'ghost-mint': {
    background: 'transparent',
    border: '1px solid var(--color-mint)',
    color: 'var(--color-mint)',
  },
  'ghost-danger': {
    background: 'transparent',
    border: '1px solid var(--color-danger)',
    color: 'var(--color-danger)',
  },
  'ghost-violet': {
    background: 'transparent',
    border: '1px solid var(--color-violet)',
    color: 'var(--color-violet)',
  },
};

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: {
    padding: '8px 14px',
    fontSize: 13,
  },
  md: {
    padding: '12px 18px',
    fontSize: 14,
  },
  lg: {
    padding: '14px 20px',
    fontSize: 14,
  },
};

function ghostHoverBackground(variant: ButtonVariant): string {
  if (variant === 'ghost-mint') return 'rgba(0,195,137,0.08)';
  if (variant === 'ghost-danger') return 'rgba(255,90,74,0.08)';
  if (variant === 'ghost-violet') return 'rgba(124,92,255,0.08)';
  return 'rgba(232,238,240,0.08)';
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  children,
  className,
  onClick,
  type = 'button',
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const isDisabled = disabled || loading;
  const isGhost = variant !== 'primary';

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      className={cn(className)}
      style={{
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        borderRadius: 10,
        fontWeight: 600,
        letterSpacing: '-0.005em',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 0.15s',
        width: fullWidth ? '100%' : undefined,
        opacity: isDisabled ? 0.5 : hovered && variant === 'primary' ? 0.9 : 1,
        background: hovered && !isDisabled && isGhost ? ghostHoverBackground(variant) : VARIANT_STYLES[variant].background,
        transform: active && !isDisabled ? 'translateY(1px)' : undefined,
      }}
    >
      {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
