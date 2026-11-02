// 90-ball UK bingo tickets (spec section 4). Pure: randomness is injected so tests can drive it.
//
// A ticket is 3 rows x 9 columns; 0 means blank. 15 numbers, 5 per row. Column c holds numbers
// from its range (1-9, 10-19, ..., 70-79, 80-90), 1-3 per column, ascending top to bottom.
import { randomInt } from './random';
import type { Stage } from './protocol';

export type Ticket = number[][];
export const ROWS = 3;
export const COLS = 9;
export const PER_ROW = 5;

export function columnRange(c: number): [number, number] {
  return [c === 0 ? 1 : c * 10, c === COLS - 1 ? 90 : c * 10 + 9];
}

export function generateTicket(rand: (n: number) => number = randomInt): Ticket {
  // Each row picks 5 of the 9 columns; retry until every column is used at least once.
  // (Each column then holds 1-3 numbers automatically.) Succeeds in a few tries on average.
  let layout: boolean[][];
  do {
    layout = Array.from({ length: ROWS }, () => {
      const cols = Array.from({ length: COLS }, (_, i) => i);
      for (let i = cols.length - 1; i > 0; i--) { const j = rand(i + 1); [cols[i], cols[j]] = [cols[j], cols[i]]; }
      const pick = new Set(cols.slice(0, PER_ROW));
      return Array.from({ length: COLS }, (_, c) => pick.has(c));
    });
  } while (!Array.from({ length: COLS }, (_, c) => layout.some(r => r[c])).every(Boolean));

  const ticket: Ticket = Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
  for (let c = 0; c < COLS; c++) {
    const rows = [0, 1, 2].filter(r => layout[r][c]);
    const [lo, hi] = columnRange(c);
    const pool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const chosen: number[] = [];
    for (let k = 0; k < rows.length; k++) chosen.push(pool.splice(rand(pool.length), 1)[0]);
    chosen.sort((a, b) => a - b);
    rows.forEach((r, k) => (ticket[r][c] = chosen[k]));
  }
  return ticket;
}

/** Every rule a valid ticket must satisfy. Used for property tests and to check stored tickets. */
export function isValidTicket(t: unknown): t is Ticket {
  if (!Array.isArray(t) || t.length !== ROWS) return false;
  if (!t.every(r => Array.isArray(r) && r.length === COLS && r.every(n => Number.isInteger(n)))) return false;
  const seen = new Set<number>();
  for (const row of t as number[][]) {
    if (row.filter(n => n !== 0).length !== PER_ROW) return false;
  }
  for (let c = 0; c < COLS; c++) {
    const [lo, hi] = columnRange(c);
    const col = (t as number[][]).map(r => r[c]).filter(n => n !== 0);
    if (col.length < 1 || col.length > 3) return false;
    for (let i = 0; i < col.length; i++) {
      const n = col[i];
      if (n < lo || n > hi || seen.has(n)) return false;
      if (i > 0 && n <= col[i - 1]) return false;
      seen.add(n);
    }
  }
  return seen.size === ROWS * PER_ROW;
}

export function ticketNumbers(t: Ticket): number[] {
  return t.flat().filter(n => n !== 0);
}

/** Number of rows whose 5 numbers are all marked. */
export function completeRows(t: Ticket, marked: ReadonlySet<number>): number {
  return t.filter(row => row.every(n => n === 0 || marked.has(n))).length;
}

/** Whether the marks satisfy a stage: 1 = Line, 2 = Two Lines, 3 = Full House. */
export function satisfiesStage(t: Ticket, marked: ReadonlySet<number>, stage: Stage): boolean {
  return completeRows(t, marked) >= stage;
}

export const STAGE_NAMES: Record<Stage, string> = { 1: 'Line', 2: 'Two Lines', 3: 'Full House' };
