export function formatCurrency(n: number, opts?: { sign?: boolean }): string {
  const abs = Math.abs(n).toFixed(2);
  const sign = opts?.sign ? (n >= 0 ? '+' : '-') : (n < 0 ? '-' : '');
  return `${sign}$${abs}`;
}

export function formatPercent(
  n: number,
  opts?: { sign?: boolean; fractionDigits?: number }
): string {
  const digits = opts?.fractionDigits ?? 1;
  const sign = opts?.sign ? (n >= 0 ? '+' : '') : '';
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatVolume(n: number): string {
  return n.toFixed(2);
}

export function formatDate(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-GB');
}

export function formatDateTime(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleString('en-GB');
}

export function formatTime(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleTimeString('en-GB', { hour12: false });
}
