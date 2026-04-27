import { Link as LinkIcon, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardBody, SectionEyebrow } from '../ui';

const STEPS = [
  {
    number: '01',
    title: 'Connect your MT5',
    description:
      'A lightweight Python agent runs on your machine, signed into your broker. No credentials leave your device.',
    icon: LinkIcon,
  },
  {
    number: '02',
    title: 'Pick verified providers',
    description:
      'Browse providers with audited history. Risk score, drawdown, and win rate stay visible before you copy.',
    icon: ShieldCheck,
  },
  {
    number: '03',
    title: 'Mirror in milliseconds',
    description:
      'When a provider fires, the backend fans the order out. Your terminal receives and executes at your size.',
    icon: Zap,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 32px' }}>
      <SectionEyebrow>How it works</SectionEyebrow>
      <h2
        style={{
          fontSize: 36,
          fontWeight: 600,
          letterSpacing: '-0.025em',
          margin: '8px 0 48px',
          maxWidth: 680,
        }}
      >
        A real bridge between terminals, with every copied trade visible.
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.number}>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <span className="font-mono-tnum" style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
                    {step.number}
                  </span>
                  <span style={{ color: 'var(--color-mint)', display: 'flex' }}>
                    <Icon size={18} />
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.55 }}>
                  {step.description}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
