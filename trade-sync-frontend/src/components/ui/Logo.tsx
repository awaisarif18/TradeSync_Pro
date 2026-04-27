import Link from 'next/link';
import { Zap } from 'lucide-react';
import { cn } from '../../lib/cn';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
  className?: string;
};

const SIZES = {
  sm: { icon: 22, text: 14 },
  md: { icon: 26, text: 16 },
  lg: { icon: 32, text: 20 },
};

export default function Logo({ size = 'md', asLink = false, className }: LogoProps) {
  const selectedSize = SIZES[size];

  const content = (
    <div
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--color-text)',
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          width: selectedSize.icon,
          height: selectedSize.icon,
          background: 'var(--color-mint)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Zap size={Math.round(selectedSize.icon * 0.55)} color="#02110b" strokeWidth={2.4} />
      </div>
      <div
        style={{
          fontSize: selectedSize.text,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: '#ffffff',
        }}
      >
        TradeSync<span style={{ color: 'var(--color-mint)' }}>Pro</span>
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" style={{ display: 'inline-flex', textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }

  return content;
}
