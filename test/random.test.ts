import { describe, it, expect } from 'vitest';
import { randomInt, shuffle } from '../src/client/lib/random';

describe('random', () => {
  it('randomInt stays in range and covers it', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = randomInt(90);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(90);
      seen.add(v);
    }
    expect(seen.size).toBe(90);
  });

  it('shuffle is a permutation', () => {
    const a = shuffle(Array.from({ length: 90 }, (_, i) => i + 1));
    expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
  });
});
