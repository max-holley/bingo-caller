// Room codes: 6 characters from an alphabet without 0/O/1/I/L.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export function generateCode(): string {
  // 31 symbols; reject bytes >= 248 (8 * 31) to avoid modulo bias.
  const out: string[] = [];
  const buf = new Uint8Array(16);
  while (out.length < CODE_LENGTH) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < 248 && out.length < CODE_LENGTH) out.push(CODE_ALPHABET[b % 31]);
    }
  }
  return out.join('');
}

/** Normalise user input (case, spaces, dashes) to a code, or null if invalid. */
export function normaliseCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(c) ? c : null;
}

export function isCode(s: string): boolean {
  return CODE_RE.test(s);
}
