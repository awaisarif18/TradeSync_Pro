const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";

/**
 * Build an alphanumeric password that satisfies the register/reset rule
 * (at least 5 chars). Uses crypto when available, falls back to Math.random.
 */
export function generatePassword(length = 14): string {
  const alphabet = UPPER + LOWER + DIGITS;
  const size = Math.max(length, 5);
  const bytes = new Uint32Array(size);

  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < size; i += 1) {
      bytes[i] = Math.floor(Math.random() * 0xffffffff);
    }
  }

  const pick = (set: string, value: number) => set[value % set.length];

  // Guarantee one of each class, then fill the rest.
  const chars = [
    pick(UPPER, bytes[0]),
    pick(LOWER, bytes[1]),
    pick(DIGITS, bytes[2]),
  ];
  for (let i = 3; i < size; i += 1) {
    chars.push(pick(alphabet, bytes[i]));
  }

  // Shuffle so the guaranteed chars are not always at the front.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = bytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
