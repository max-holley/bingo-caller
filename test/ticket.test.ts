import { describe, it, expect } from 'vitest';
import { generateTicket, isValidTicket, completeRows, satisfiesStage, ticketNumbers, columnRange } from '../src/shared/ticket';

describe('ticket generation', () => {
  it('10,000 generated tickets all satisfy every rule', () => {
    const colCounts = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const t = generateTicket();
      if (!isValidTicket(t)) throw new Error('invalid ticket: ' + JSON.stringify(t));
      colCounts.add(t[0].map((_, c) => t.filter(r => r[c]).length).join(''));
    }
    // Column layouts vary (some columns get 1, 2 or 3 numbers).
    expect(colCounts.size).toBeGreaterThan(50);
  });

  it('every number 1-90 can appear, each in its own column', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) for (const n of ticketNumbers(generateTicket())) seen.add(n);
    expect(seen.size).toBe(90);
    expect(columnRange(0)).toEqual([1, 9]);
    expect(columnRange(4)).toEqual([40, 49]);
    expect(columnRange(8)).toEqual([80, 90]);
  });

  it('validator rejects broken tickets', () => {
    const good = generateTicket();
    expect(isValidTicket(good)).toBe(true);
    const bad = (f: (t: number[][]) => void) => { const t = structuredClone(good); f(t); return isValidTicket(t); };
    expect(bad(t => t.pop())).toBe(false);
    expect(bad(t => { const c = t[0].findIndex(n => n === 0); t[0][c] = columnRange(c)[0]; })).toBe(false); // 6 in a row
    expect(bad(t => { const c = t[0].findIndex(n => n !== 0); t[0][c] = 95; })).toBe(false);
    expect(isValidTicket('nope')).toBe(false);
  });
});

describe('stage detection', () => {
  const t = [
    [1, 0, 21, 0, 41, 0, 61, 0, 81],
    [0, 12, 0, 32, 0, 52, 0, 72, 82],
    [3, 0, 23, 33, 0, 53, 0, 73, 0],
  ];
  it('is a valid ticket', () => expect(isValidTicket(t)).toBe(true));

  it('counts complete rows and stages', () => {
    const m = new Set([1, 21, 41, 61, 81]);
    expect(completeRows(t, m)).toBe(1);
    expect(satisfiesStage(t, m, 1)).toBe(true);
    expect(satisfiesStage(t, m, 2)).toBe(false);
    [12, 32, 52, 72].forEach(n => m.add(n));
    expect(completeRows(t, m)).toBe(1);
    m.add(82);
    expect(satisfiesStage(t, m, 2)).toBe(true);
    expect(satisfiesStage(t, m, 3)).toBe(false);
    [3, 23, 33, 53, 73].forEach(n => m.add(n));
    expect(satisfiesStage(t, m, 3)).toBe(true);
  });
});
