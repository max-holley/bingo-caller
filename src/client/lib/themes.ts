import { writable, get } from 'svelte/store';
import { KEYS, store } from './storage';

export type ThemeId = 'midnight' | 'ocean' | 'sunset' | 'forest' | 'aurora' | 'halloween' | 'christmas';

export const THEMES: ReadonlyArray<{ id: ThemeId; label: string; swatch: string }> = [
  { id: 'midnight',  label: 'Midnight',     swatch: 'conic-gradient(#f5c842 120deg, #ff3fa4 120deg 240deg, #00e5ff 240deg)' },
  { id: 'ocean',     label: 'Ocean',        swatch: 'conic-gradient(#00cfb5 120deg, #0099ff 120deg 240deg, #6cffbe 240deg)' },
  { id: 'sunset',    label: 'Sunset',       swatch: 'conic-gradient(#ff8c00 120deg, #ff2d55 120deg 240deg, #ffd600 240deg)' },
  { id: 'forest',    label: 'Forest',       swatch: 'conic-gradient(#2dff6e 120deg, #00e5a0 120deg 240deg, #b8ff3f 240deg)' },
  { id: 'aurora',    label: 'Aurora',       swatch: 'conic-gradient(#b46fff 120deg, #ff4fe0 120deg 240deg, #4de8ff 240deg)' },
  { id: 'halloween', label: 'Halloween 🎃', swatch: 'conic-gradient(#ff7a00 120deg, #9b30ff 120deg 240deg, #7dff3a 240deg)' },
  { id: 'christmas', label: 'Christmas 🎄', swatch: 'conic-gradient(#ff4b4b 120deg, #1fa34a 120deg 240deg, #ffd166 240deg)' },
];

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && THEMES.some(t => t.id === v);
}

// Seasonal themes become the automatic default during their window each year.
// (month is 0-based: 9 = October, 11 = December)
const SEASONS: ReadonlyArray<{ id: ThemeId; active: (d: Date) => boolean }> = [
  { id: 'halloween', active: d => d.getMonth() === 9  && d.getDate() >= 26 }, // 26–31 Oct
  { id: 'christmas', active: d => d.getMonth() === 11 && d.getDate() <= 26 }, // 1–26 Dec
];

export function currentSeason(d = new Date()) {
  return SEASONS.find(s => s.active(d)) ?? null;
}

/** The theme currently shown. */
export const theme = writable<ThemeId>('midnight');

/** Set by an online game: the host's theme overrides the local choice while in a game. */
let override: ThemeId | null = null;

function apply(id: ThemeId) {
  document.documentElement.dataset.theme = id === 'midnight' ? '' : id;
  theme.set(id);
}

function localDefault(): ThemeId {
  const saved = store.get(KEYS.theme);
  const savedTheme: ThemeId = isThemeId(saved) ? saved : 'midnight';
  const season = currentSeason();
  const optedOut = season && store.get(KEYS.optOut(season.id)) === String(new Date().getFullYear());
  return season && !optedOut ? season.id : savedTheme;
}

export function initTheme() {
  apply(localDefault());
}

/** While hosting, the picker sets the room theme instead of the local preference. */
let pickHandler: ((id: ThemeId) => void) | null = null;
export function setPickHandler(fn: ((id: ThemeId) => void) | null) { pickHandler = fn; }

/** User picked a theme in the picker. */
export function pickTheme(id: ThemeId) {
  if (pickHandler) { pickHandler(id); return; }
  const season = currentSeason();
  if (season) {
    if (id === season.id) {
      // Seasonal default — don't overwrite the user's normal theme
      store.remove(KEYS.optOut(season.id));
      if (!override) apply(id);
      return;
    }
    store.set(KEYS.optOut(season.id), String(new Date().getFullYear()));
  }
  store.set(KEYS.theme, id);
  if (!override) apply(id);
}

export function setThemeOverride(id: ThemeId | null) {
  override = id;
  apply(id ?? localDefault());
}

export const isHalloween = () => get(theme) === 'halloween';
export const isChristmas = () => get(theme) === 'christmas';
