import { describe, it, expect } from 'vitest';
import { sanitizeName, dedupeName, NAME_MAX } from '../src/shared/names';

describe('sanitizeName', () => {
  it('trims and collapses whitespace', () => {
    expect(sanitizeName('  Ann \t\n  Lee  ')).toBe('Ann Lee');
  });
  it('strips control, zero-width and bidi override characters', () => {
    expect(sanitizeName('A\u0000b​c‮d⁦e﻿')).toBe('Abcde');
  });
  it('rejects empty or invisible-only names', () => {
    expect(sanitizeName('')).toBeNull();
    expect(sanitizeName('   ')).toBeNull();
    expect(sanitizeName('​‮')).toBeNull();
  });
  it('caps at 20 user-perceived characters without splitting emoji', () => {
    expect(sanitizeName('x'.repeat(30))).toBe('x'.repeat(NAME_MAX));
    const fam = '👨‍👩‍👧';
    const out = sanitizeName(fam.repeat(25))!;
    expect(out).toBe(fam.repeat(20));
  });
  it('leaves markup as plain text (rendering is text-only)', () => {
    expect(sanitizeName('<img onerror=x>')).toBe('<img onerror=x>');
  });
});

describe('dedupeName', () => {
  it('appends (2), (3) case-insensitively', () => {
    expect(dedupeName('Sam', [])).toBe('Sam');
    expect(dedupeName('sam', ['Sam'])).toBe('sam (2)');
    expect(dedupeName('Sam', ['Sam', 'Sam (2)'])).toBe('Sam (3)');
  });
  it('keeps the result within the length cap', () => {
    const long = 'y'.repeat(20);
    const out = dedupeName(long, [long]);
    expect([...out].length).toBeLessThanOrEqual(NAME_MAX);
    expect(out.endsWith(' (2)')).toBe(true);
  });
});
