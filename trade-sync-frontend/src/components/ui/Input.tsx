'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type InputProps = {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export default function Input({
  label,
  error,
  success,
  hint,
  leftIcon,
  rightIcon,
  className,
  autoComplete,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? 'var(--color-danger)'
    : success
      ? 'var(--color-mint)'
      : focused
        ? 'var(--color-mint)'
        : 'var(--color-line)';

  return (
    <div style={{ width: '100%' }}>
      {label ? (
        <label
          style={{
            display: 'block',
            fontSize: 13,
            color: 'var(--color-text-2)',
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      ) : null}
      <div style={{ position: 'relative' }}>
        {leftIcon ? (
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-3)',
              width: 16,
              height: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {leftIcon}
          </span>
        ) : null}
        <input
          {...props}
          autoComplete={autoComplete ?? 'off'}
          className={cn(className)}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={{
            width: '100%',
            background: 'var(--color-surface-2)',
            border: `1px solid ${borderColor}`,
            borderRadius: 10,
            padding: leftIcon
              ? '14px 14px 14px 42px'
              : rightIcon
                ? '14px 42px 14px 14px'
                : '14px',
            fontSize: 15,
            color: 'var(--color-text)',
            outline: 'none',
            WebkitBoxShadow: '0 0 0 1000px var(--color-surface-2) inset',
            WebkitTextFillColor: 'var(--color-text)',
            ...style,
          }}
        />
        {rightIcon ? (
          <span
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-3)',
              width: 16,
              height: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {rightIcon}
          </span>
        ) : null}
      </div>
      {error ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-danger)',
            fontSize: 12,
            marginTop: 6,
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      ) : success ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-mint)',
            fontSize: 12,
            marginTop: 6,
          }}
        >
          <CheckCircle2 size={14} />
          {success}
        </div>
      ) : hint ? (
        <div style={{ color: 'var(--color-text-3)', fontSize: 12, marginTop: 6 }}>{hint}</div>
      ) : null}
    </div>
  );
}
