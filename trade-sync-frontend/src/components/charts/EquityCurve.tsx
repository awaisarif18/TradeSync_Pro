type EquityCurveProps = {
  width?: number;
  height?: number;
  accent?: string;
  data?: number[];
};

function syntheticCurve(): number[] {
  const points: number[] = [];
  for (let i = 0; i < 80; i++) {
    const trend = i * 0.6;
    const noise =
      (Math.sin(i * 0.7) + Math.cos(i * 0.31) * 0.7 + Math.sin(i * 1.4) * 0.4) * 4;
    points.push(100 + trend + noise);
  }
  return points;
}

export default function EquityCurve({
  width = 540,
  height = 220,
  accent = 'var(--color-mint)',
  data,
}: EquityCurveProps) {
  const points = data && data.length > 0 ? data : syntheticCurve();
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const xs = points.map((_, index) => (index / Math.max(points.length - 1, 1)) * width);
  const ys = points.map((point) => height - ((point - min) / range) * (height - 20) - 10);
  const path = xs
    .map((x, index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[index].toFixed(1)}`)
    .join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const gradientId = `curve-${Math.abs(path.length + Math.round(height * width))}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((tick) => (
        <line
          key={tick}
          x1="0"
          x2={width}
          y1={height * tick}
          y2={height * tick}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="2 4"
        />
      ))}
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
