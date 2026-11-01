import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SECURITY_HEADERS } from '../src/shared/security';

describe('security headers', () => {
  it('public/_headers matches the Worker header set', () => {
    const file = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      expect(file).toContain(`  ${k}: ${v}\n`);
    }
  });

  it('CSP allows no third-party origins', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy'];
    const hosts = csp.match(/\b(?:https?|wss?):\/\/[^\s;]+/g) ?? [];
    expect(hosts).toEqual(['wss://bingo.webh.dev']);
    expect(csp).not.toMatch(/unsafe-eval/);
    expect(csp).toMatch(/script-src 'self';/);
  });
});
