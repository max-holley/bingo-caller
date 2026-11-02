import { describe, it, expect } from 'vitest';
import { generateCode, normaliseCode, isCode, CODE_ALPHABET } from '../src/shared/code';

describe('room codes', () => {
  it('are 6 chars from the safe alphabet', () => {
    for (let i = 0; i < 2000; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[A-Z2-9]{6}$/);
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
      expect(c).not.toMatch(/[01ILO]/);
    }
  });
  it('normalises user input', () => {
    expect(normaliseCode(' abc-def ')).toBe('ABCDEF');
    expect(normaliseCode('ABC12F')).toBeNull();
    expect(normaliseCode('ABCDE')).toBeNull();
    expect(isCode('ABCDEF')).toBe(true);
  });
});
