/** Uniform random integer in [0, n) from crypto.getRandomValues (rejection sampling, no modulo bias). */
export function randomInt(n: number): number {
  if (!Number.isInteger(n) || n <= 0 || n > 0x1_0000_0000) throw new RangeError('n out of range');
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

/** Fisher–Yates shuffle in place using crypto randomness. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
