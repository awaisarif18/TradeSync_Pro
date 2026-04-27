import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import TraderCard, { type TraderCardData } from '../marketplace/TraderCard';
import { Button, SectionEyebrow } from '../ui';

type ProviderShowcaseProps = {
  providers: TraderCardData[];
};

export default function ProviderShowcase({ providers }: ProviderShowcaseProps) {
  if (providers.length === 0) return null;

  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <SectionEyebrow>Top this month</SectionEyebrow>
          <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 0' }}>
            Verified providers
          </h2>
        </div>
        <Link
          href="/traders"
          style={{
            color: 'var(--color-mint)',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          See all <span className="font-mono-tnum">247</span> <ArrowRight size={15} />
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {providers.slice(0, 3).map((provider) => (
          <TraderCard key={provider.id} trader={provider} mode="showcase" />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
        <Link href="/traders" style={{ textDecoration: 'none' }}>
          <Button variant="ghost" size="md">Browse providers</Button>
        </Link>
      </div>
    </section>
  );
}

export type { TraderCardData };
