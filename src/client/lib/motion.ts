// Shared transition settings. Everything respects the user's "reduce motion" setting.
import { cubicOut } from 'svelte/easing';

export const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Duration in ms, or 0 when the user prefers reduced motion. */
export const ms = (d: number): number => (reducedMotion() ? 0 : d);

/** Height + fade for things that open and close in the page flow. */
export const reveal = () => ({ duration: ms(220), easing: cubicOut });
