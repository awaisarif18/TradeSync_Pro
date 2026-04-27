const PALETTE = [
  '#7ee5ad', '#ffb547', '#7cc4ff',
  '#c79bff', '#ff9b8a', '#94e0d4',
];

export function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
