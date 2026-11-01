// Seasonal sound effects (synthesised with Web Audio — no files needed).
// Ported unchanged from the original app.js; only the mute toggle moved into a store.
/* eslint-disable */
// @ts-nocheck — verbatim port of untyped Web Audio code
import { writable, get } from 'svelte/store';
import { KEYS, store } from './storage';

export const muted = writable(store.get(KEYS.muted) === '1');
/** Only written when the user presses the toggle (never on load). */
export function toggleMuted() {
  const m = !get(muted);
  muted.set(m);
  store.set(KEYS.muted, m ? '1' : '0');
  return m;
}

const Sfx = (function () {
  let ctx: AudioContext | null = null;

  function audio() {
    if (get(muted)) return null;
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function master(c, vol) {
    const g = c.createGain();
    g.gain.value = vol;
    g.connect(c.destination);
    return g;
  }

  function noiseBuffer(c, secs) {
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function pickNew(list, lastRef) {
    let i;
    do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === lastRef.i);
    lastRef.i = i;
    return list[i];
  }

  return { audio, master, noiseBuffer, pickNew };
})();

export const SpookySound = (function () {
  const { audio, master, noiseBuffer, pickNew } = Sfx;
  const last = { i: -1 };

  // Eerie theremin warble while the number rolls (~2s)
  function roll() {
    const c = audio(); if (!c) return;
    const t = c.currentTime;
    const out = master(c, 0);
    out.gain.linearRampToValueAtTime(0.12, t + 0.2);
    out.gain.linearRampToValueAtTime(0.12, t + 1.7);
    out.gain.linearRampToValueAtTime(0, t + 2.1);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 2);
    const lfo = c.createOscillator(), lfoGain = c.createGain();
    lfo.frequency.value = 7; lfoGain.gain.value = 25;
    lfo.connect(lfoGain).connect(o.frequency);
    o.connect(out);
    o.start(t); lfo.start(t);
    o.stop(t + 2.2); lfo.stop(t + 2.2);
  }

  // Ghostly "woooOOooo"
  function ghost() {
    const c = audio(); if (!c) return;
    const t = c.currentTime;
    const out = master(c, 0);
    out.gain.linearRampToValueAtTime(0.18, t + 0.3);
    out.gain.linearRampToValueAtTime(0, t + 1.8);
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(260, t);
    o.frequency.linearRampToValueAtTime(420, t + 0.6);
    o.frequency.linearRampToValueAtTime(220, t + 1.8);
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 5; lg.gain.value = 14;
    lfo.connect(lg).connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
    o.connect(f).connect(out);
    o.start(t); lfo.start(t); o.stop(t + 1.9); lfo.stop(t + 1.9);
  }

  // Witch's cackle — quick descending "ha-ha-ha" bursts
  function cackle() {
    const c = audio(); if (!c) return;
    const t0 = c.currentTime;
    const out = master(c, 0.16);
    for (let i = 0; i < 7; i++) {
      const t = t0 + i * 0.13;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth';
      const base = 900 - i * 55;
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 0.7, t + 0.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 2;
      o.connect(f).connect(g).connect(out);
      o.start(t); o.stop(t + 0.12);
    }
  }

  // Creaky door
  function creak() {
    const c = audio(); if (!c) return;
    const t = c.currentTime;
    const out = master(c, 0.14);
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t);
    o.frequency.linearRampToValueAtTime(140, t + 0.5);
    o.frequency.linearRampToValueAtTime(70, t + 1.3);
    // Jittery amplitude = creak
    const g = c.createGain(); g.gain.value = 0;
    for (let i = 0; i < 40; i++) {
      const tt = t + i * 0.033;
      g.gain.setValueAtTime(Math.random() * 0.9 + 0.1, tt);
    }
    g.gain.setValueAtTime(0, t + 1.35);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 6;
    o.connect(f).connect(g).connect(out);
    o.start(t); o.stop(t + 1.4);
  }

  // Thunder rumble
  function thunder() {
    const c = audio(); if (!c) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 2.5);
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 2.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.4);
    g.gain.linearRampToValueAtTime(0.35, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t); src.stop(t + 2.5);
  }

  // Haunted organ — diminished chord stab
  function organ() {
    const c = audio(); if (!c) return;
    const t = c.currentTime;
    const out = master(c, 0);
    out.gain.linearRampToValueAtTime(0.09, t + 0.05);
    out.gain.setValueAtTime(0.09, t + 1.0);
    out.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    [110, 130.81, 155.56, 185.0, 220].forEach(freq => {
      [1, 2].forEach(h => {
        const o = c.createOscillator();
        o.type = h === 1 ? 'square' : 'sine';
        o.frequency.value = freq * h;
        o.detune.value = Math.random() * 8 - 4;
        o.connect(out);
        o.start(t); o.stop(t + 2.1);
      });
    });
  }

  const REVEALS = [ghost, cackle, creak, thunder, organ];
  function reveal() { pickNew(REVEALS, last)(); }

  return { roll, reveal, cackle, ghost };
})();

export const JingleSound = (function () {
  const { audio, master, noiseBuffer, pickNew } = Sfx;
  const last = { i: -1 };
  const NOTE = { G3: 196, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
                 C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5 };

  // Glockenspiel-ish bell: a few inharmonic partials with fast decay
  function bell(c, out, freq, t, dur = 1.2, vol = 1) {
    [[1, 1], [2.76, 0.35], [5.4, 0.15], [8.93, 0.06]].forEach(([mult, amp]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp * vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / Math.sqrt(mult));
      o.connect(g).connect(out);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }

  function melody(notes, beat, vol = 0.22) {
    const c = audio(); if (!c) return;
    const out = master(c, vol);
    let t = c.currentTime + 0.02;
    notes.forEach(([n, len]) => {
      if (n) bell(c, out, NOTE[n], t, Math.max(0.5, len * beat * 2.2));
      t += len * beat;
    });
  }

  // Sleigh bells: shimmering high-passed noise jingles
  function sleighBells(dur = 2, vol = 0.18, rate = 0.125) {
    const c = audio(); if (!c) return;
    const out = master(c, vol);
    const buf = noiseBuffer(c, 0.15);
    const t0 = c.currentTime;
    for (let t = 0; t < dur; t += rate) {
      [0, rate * 0.4].forEach((off, k) => {
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'bandpass';
        hp.frequency.value = 7000 + Math.random() * 2500; hp.Q.value = 1.5;
        const g = c.createGain();
        const st = t0 + t + off;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(k ? 0.5 : 1, st + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.12);
        src.connect(hp).connect(g).connect(out);
        src.start(st); src.stop(st + 0.15);
      });
    }
  }

  function roll() { sleighBells(2.0, 0.16); }

  // "Jingle bells, jingle bells…"
  function jingle() {
    melody([['E5',1],['E5',1],['E5',2],['E5',1],['E5',1],['E5',2],['E5',1],['G5',1],['C5',1.5],['D5',0.5],['E5',3]], 0.17);
  }
  // "We wish you a Merry Christmas…"
  function wish() {
    melody([['G4',1],['C5',1],['C5',0.5],['D5',0.5],['C5',0.5],['B4',0.5],['A4',1],['A4',2]], 0.24);
  }
  // Sparkly rising celesta arpeggio
  function sparkle() {
    melody([['C5',0.5],['E5',0.5],['G5',0.5],['C6',0.5],['G5',0.5],['C6',2]], 0.09, 0.2);
    sleighBells(0.6, 0.08, 0.1);
  }
  // Deep church bells — "dong… ding… dong"
  function churchBells() {
    const c = audio(); if (!c) return;
    const out = master(c, 0.3);
    const t = c.currentTime + 0.02;
    [[NOTE.G3, 0], [NOTE.D4, 0.55], [NOTE.G3 * 1.0, 1.1]].forEach(([f, d]) => bell(c, out, f, t + d, 2.4));
  }
  // Santa's "Ho ho ho!" — low buzzy vowel bursts through a formant filter
  function hohoho() {
    const c = audio(); if (!c) return;
    const out = master(c, 0.35);
    const t0 = c.currentTime + 0.02;
    [0, 0.32, 0.64].forEach((d, i) => {
      const t = t0 + d;
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(150 - i * 8, t);
      o.frequency.exponentialRampToValueAtTime(105 - i * 6, t + 0.25);
      const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 500; f1.Q.value = 4;
      const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 850; f2.Q.value = 5;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.27);
      // breathy "h" onset
      const n = c.createBufferSource(); n.buffer = noiseBuffer(c, 0.08);
      const ng = c.createGain(); ng.gain.value = 0.25;
      n.connect(ng).connect(f2);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.3); n.start(t); n.stop(t + 0.08);
    });
    sleighBells(1.0, 0.07);
  }

  const REVEALS = [jingle, wish, sparkle, churchBells, hohoho];
  function reveal() { pickNew(REVEALS, last)(); }

  function finale() {
    sleighBells(4.5, 0.12);
    melody([['E5',1],['E5',1],['E5',2],['E5',1],['E5',1],['E5',2],['E5',1],['G5',1],['C5',1.5],['D5',0.5],['E5',4],
            ['F5',1],['F5',1],['F5',1.5],['F5',0.5],['F5',1],['E5',1],['E5',1],['E5',0.5],['E5',0.5],
            ['G5',1],['G5',1],['F5',1],['D5',1],['C5',4]], 0.17);
  }

  return { roll, reveal, finale, preview: sparkle };
})();

