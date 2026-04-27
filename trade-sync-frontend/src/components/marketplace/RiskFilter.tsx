import { Pill } from '../ui';

type RiskFilterValue = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH';

type RiskFilterProps = {
  value: RiskFilterValue;
  counts: {
    all: number;
    low: number;
    medium: number;
    high: number;
  };
  onChange: (value: RiskFilterValue) => void;
};

const OPTIONS: Array<{ value: RiskFilterValue; label: string; countKey: keyof RiskFilterProps['counts'] }> = [
  { value: 'ALL', label: 'All', countKey: 'all' },
  { value: 'LOW', label: 'Low Risk', countKey: 'low' },
  { value: 'MEDIUM', label: 'Medium Risk', countKey: 'medium' },
  { value: 'HIGH', label: 'High Risk', countKey: 'high' },
];

export default function RiskFilter({ value, counts, onChange }: RiskFilterProps) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <span
            key={option.value}
            role="button"
            tabIndex={0}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onChange(option.value);
            }}
            style={{
              borderRadius: 9999,
              background: active ? 'var(--color-mint-soft)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <Pill variant={active ? 'outline-mint' : 'default'}>
              <span>{option.label}</span>
              <span className="font-mono-tnum" style={{ opacity: 0.75 }}>
                ({counts[option.countKey]})
              </span>
            </Pill>
          </span>
        );
      })}
    </div>
  );
}
