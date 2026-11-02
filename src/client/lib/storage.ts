// All app storage lives under the `bingo.` prefix so "Clear data on this device" can wipe it
// with one sweep (clearAllData). Only localStorage is used; no cookies.

export const KEYS = {
  theme: 'bingo.theme',
  muted: 'bingo.muted',
  optOut: (seasonId: string) => `bingo.optout.${seasonId}`,
} as const;

// One-off migration from the pre-v1 key names.
const LEGACY: Array<[string, string]> = [
  ['bingo-theme', KEYS.theme],
  ['bingo-spooky-muted', KEYS.muted],
  ['bingo-halloween-optout', KEYS.optOut('halloween')],
  ['bingo-christmas-optout', KEYS.optOut('christmas')],
];

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

export const store = {
  get: (k: string): string | null => safe(() => localStorage.getItem(k), null),
  set: (k: string, v: string): void => safe(() => localStorage.setItem(k, v), undefined),
  remove: (k: string): void => safe(() => localStorage.removeItem(k), undefined),
};

export function migrateLegacyKeys(): void {
  for (const [oldKey, newKey] of LEGACY) {
    const v = store.get(oldKey);
    if (v === null) continue;
    if (store.get(newKey) === null) store.set(newKey, v);
    store.remove(oldKey);
  }
}

/** "Clear data on this device": remove every `bingo.*` key (and the legacy pre-v1 keys). */
export function clearAllData(): void {
  safe(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('bingo.') || LEGACY.some(([old]) => old === k))) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }, undefined);
}
