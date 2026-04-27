export const ROLE_DISPLAY: Record<string, string> = {
  MASTER: 'Provider',
  SLAVE: 'Copier',
  ADMIN: 'Admin',
};

export function roleDisplay(role: string): string {
  return ROLE_DISPLAY[role] ?? role;
}

export function roleColor(role: string): 'mint' | 'violet' | 'danger' | 'neutral' {
  if (role === 'MASTER') return 'mint';
  if (role === 'SLAVE') return 'violet';
  if (role === 'ADMIN') return 'danger';
  return 'neutral';
}
