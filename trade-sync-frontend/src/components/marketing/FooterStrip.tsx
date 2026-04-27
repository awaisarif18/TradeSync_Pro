export default function FooterStrip() {
  return (
    <div
      style={{
        borderTop: '1px solid var(--color-line)',
        padding: 32,
        color: 'var(--color-text-3)',
        fontSize: 12,
        textAlign: 'center',
      }}
    >
      &copy; <span className="font-mono-tnum">2026</span> TradeSync Pro. Trading involves risk. Past
      performance does not guarantee future results.
    </div>
  );
}
