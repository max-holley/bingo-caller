// The current game session on this device (localStorage key `bingo.session`).
// Written only after the user hosts or joins a game; removed when the game ends, the room is
// gone, or `expiresAt` passes (max 24h from room creation). Expired records are purged on load.
import { store } from './storage';

export const SESSION_KEY = 'bingo.session';

export type HostSession = { v: 1; role: 'host'; code: string; hostKey: string; expiresAt: number };
export type PlayerSession = {
  v: 1; role: 'player'; code: string; playerId: string; playerKey: string; name: string; expiresAt: number;
  /** Ticket and marks: milestone 3. */
  ticket?: number[][];
  marks?: number[];
};
export type Session = HostSession | PlayerSession;

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function valid(s: unknown): s is Session {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  if (o.v !== 1 || typeof o.code !== 'string' || typeof o.expiresAt !== 'number') return false;
  if (o.role === 'host') return typeof o.hostKey === 'string';
  if (o.role === 'player') return typeof o.playerId === 'string' && typeof o.playerKey === 'string' && typeof o.name === 'string';
  return false;
}

export function loadSession(now = Date.now()): Session | null {
  const raw = store.get(SESSION_KEY);
  if (raw === null) return null;
  let s: unknown;
  try { s = JSON.parse(raw); } catch { s = null; }
  if (!valid(s) || s.expiresAt <= now || s.expiresAt > now + MAX_AGE_MS) {
    store.remove(SESSION_KEY);
    return null;
  }
  return s;
}

export function saveSession(s: Session) {
  store.set(SESSION_KEY, JSON.stringify({ ...s, expiresAt: Math.min(s.expiresAt, Date.now() + MAX_AGE_MS) }));
}

export function updatePlayerSession(patch: Partial<PlayerSession>) {
  const s = loadSession();
  if (s?.role === 'player') saveSession({ ...s, ...patch });
}

export function clearSession() {
  store.remove(SESSION_KEY);
}

/** Purge expired records on app load. */
export function purgeExpired() {
  loadSession();
}
