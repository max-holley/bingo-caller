// Player name rules (spec section 8): 1–20 characters after trimming; strip control, zero-width
// and bidi-override characters; collapse whitespace; de-duplicate with " (2)", " (3)"…
export const NAME_MAX = 20;

// C0/C1 controls, zero-width chars (ZWJ is kept only inside emoji sequences), bidi embedding/override/isolate marks, BOM, soft hyphen,
// Mongolian vowel separator, word joiner and invisible operators, tag characters, variation
// selectors are kept (needed for emoji).
const STRIP = /[\u0000-\u001F\u007F-\u009F\u00AD\u180E\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\u{E0000}-\u{E007F}]/gu;

// Zero-width joiner not sitting between two emoji.
const LONE_ZWJ = /(?<!\p{Extended_Pictographic}[\u{1F3FB}-\u{1F3FF}\uFE0F]?)\u200D|\u200D(?!\p{Extended_Pictographic})/gu;

/** Returns the cleaned name, or null if nothing usable is left. Counts user-perceived characters. */
export function sanitizeName(raw: string): string | null {
  let s = raw.normalize('NFC').replace(STRIP, '').replace(LONE_ZWJ, '').replace(/\s+/gu, ' ').trim();
  const chars = graphemes(s);
  if (chars.length === 0) return null;
  if (chars.length > NAME_MAX) s = chars.slice(0, NAME_MAX).join('').trim();
  return s.length ? s : null;
}

/** Make `name` unique among `taken` (case-insensitive) by appending " (2)", " (3)"… */
export function dedupeName(name: string, taken: Iterable<string>): string {
  const lower = new Set([...taken].map(t => t.toLocaleLowerCase()));
  if (!lower.has(name.toLocaleLowerCase())) return name;
  for (let i = 2; ; i++) {
    const suffix = ` (${i})`;
    const base = graphemes(name).slice(0, NAME_MAX - suffix.length).join('').trimEnd();
    const candidate = base + suffix;
    if (!lower.has(candidate.toLocaleLowerCase())) return candidate;
  }
}

function graphemes(s: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map(x => x.segment);
  }
  return [...s];
}
