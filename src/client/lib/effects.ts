// Background decorations and celebration bursts, ported from the original app.js.
// innerHTML is used here only for constant, app-authored SVG/markup — never for user data.
import { isChristmas, isHalloween } from './themes';

export const CANDY_CANE_SVG = `<svg viewBox="0 0 40 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 95 V30 a10 10 0 0 0 -20 0" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>
    <path d="M30 95 V30 a10 10 0 0 0 -20 0" fill="none" stroke="#e8232c" stroke-width="9" stroke-linecap="round" stroke-dasharray="6 7"/>
  </svg>`;
const SNOWMAN_SVG = `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="snowShade" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfe0ee"/></radialGradient></defs>
    <circle cx="50" cy="108" r="30" fill="url(#snowShade)"/>
    <circle cx="50" cy="66" r="22" fill="url(#snowShade)"/>
    <circle cx="50" cy="34" r="16" fill="url(#snowShade)"/>
    <rect x="34" y="4" width="32" height="20" rx="2" fill="#1b1b22"/>
    <rect x="28" y="20" width="44" height="6" rx="3" fill="#1b1b22"/>
    <rect x="34" y="16" width="32" height="4" fill="#e8232c"/>
    <circle cx="44" cy="32" r="2.4" fill="#1b1b22"/><circle cx="56" cy="32" r="2.4" fill="#1b1b22"/>
    <path d="M50 36 L66 40 L50 40 Z" fill="#ff8a1f"/>
    <path d="M42 42 q8 5 16 0" fill="none" stroke="#1b1b22" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M32 50 q18 8 36 0 v6 q-18 8 -36 0 z" fill="#e8232c"/>
    <rect x="58" y="52" width="8" height="22" rx="2" fill="#e8232c" transform="rotate(-12 62 56)"/>
    <circle cx="50" cy="62" r="2.6" fill="#1b1b22"/><circle cx="50" cy="72" r="2.6" fill="#1b1b22"/><circle cx="50" cy="100" r="2.8" fill="#1b1b22"/>
    <path d="M29 66 L8 52 M14 56 L10 46" stroke="#6b4423" stroke-width="3" stroke-linecap="round"/>
    <path d="M71 66 L92 52 M86 56 L92 46" stroke="#6b4423" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

export function buildStars(sf: HTMLElement) {
  const count = 80;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      --d:${(Math.random() * 4 + 2).toFixed(1)}s;
      --o:${(Math.random() * 0.5 + 0.2).toFixed(2)};
      animation-delay:${(Math.random() * 5).toFixed(1)}s;
    `;
    sf.appendChild(s);
  }
}

// Halloween decorations (hidden by CSS unless theme is active)
export function buildSpookLayer(layer: HTMLElement) {
  layer.innerHTML = '<div class="spook-moon"></div><div class="spook-fog"></div>';
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('div');
    b.className = 'spook-bat';
    b.innerHTML = '<span>🦇</span>';
    b.style.cssText = `--top:${(5 + Math.random() * 40).toFixed(0)}%; --size:${(18 + Math.random() * 18).toFixed(0)}px; --dur:${(12 + Math.random() * 12).toFixed(1)}s; --delay:${(-Math.random() * 20).toFixed(1)}s;`;
    layer.appendChild(b);
  }
  const floaters = ['🎃', '🎃', '🎃', '👻', '🎃', '🕯️', '🎃'];
  floaters.forEach((e, i) => {
    const p = document.createElement('div');
    p.className = 'spook-pumpkin';
    p.textContent = e;
    p.style.cssText = `--left:${(i / floaters.length * 100 + Math.random() * 8).toFixed(0)}%; --size:${(26 + Math.random() * 26).toFixed(0)}px; --dur:${(16 + Math.random() * 14).toFixed(1)}s; --delay:${(-Math.random() * 25).toFixed(1)}s;`;
    layer.appendChild(p);
  });
}

// Christmas decorations (hidden by CSS unless theme is active)
export function buildXmasLayer(layer: HTMLElement) {
  // Fairy lights strung along the top
  const lights = document.createElement('div');
  lights.className = 'xmas-lights';
  const colors = ['#ff4b4b', '#ffd166', '#2fd96b', '#4db8ff', '#ff7ad9'];
  for (let i = 0; i < 28; i++) {
    const b = document.createElement('span');
    b.className = 'xmas-bulb';
    b.style.cssText = `--c:${colors[i % colors.length]}; --delay:${(i % 3) * 0.5}s;`;
    lights.appendChild(b);
  }
  layer.appendChild(lights);

  // Falling snow
  for (let i = 0; i < 70; i++) {
    const f = document.createElement('div');
    f.className = 'xmas-flake';
    if (i % 6 === 0) f.textContent = '❄';
    const size = i % 6 === 0 ? 10 + Math.random() * 12 : 2 + Math.random() * 4;
    f.style.cssText = `--left:${(Math.random() * 100).toFixed(1)}%; --size:${size.toFixed(1)}px; --dur:${(8 + Math.random() * 10).toFixed(1)}s; --delay:${(-Math.random() * 18).toFixed(1)}s; --sway:${(Math.random() * 60 - 30).toFixed(0)}px;`;
    layer.appendChild(f);
  }

  // Snowy ground with snowmen and candy canes
  const ground = document.createElement('div');
  ground.className = 'xmas-ground';
  ground.innerHTML = `
    <div class="xmas-snowman" style="--left:4%;  --h:150px">${SNOWMAN_SVG}</div>
    <div class="xmas-cane"    style="--left:15%; --h:90px; --rot:-8deg">${CANDY_CANE_SVG}</div>
    <div class="xmas-cane"    style="--left:80%; --h:80px; --rot:10deg; transform:scaleX(-1)">${CANDY_CANE_SVG}</div>
    <div class="xmas-snowman" style="--left:86%; --h:115px">${SNOWMAN_SVG}</div>`;
  layer.appendChild(ground);
}

function getThemeColors() {
  const s = getComputedStyle(document.documentElement);
  return [
    s.getPropertyValue('--neon-gold').trim(),
    s.getPropertyValue('--neon-pink').trim(),
    s.getPropertyValue('--neon-cyan').trim(),
    '#ff8c00', '#a3ff00',
  ];
}

export function confettiBurst(from: HTMLElement) {
  const rect = from.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = 28;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const angle = (Math.random() * 360) * (Math.PI / 180);
    const dist = 80 + Math.random() * 140;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 60;
    const dur = 0.8 + Math.random() * 0.7;
    const colors = getThemeColors();
    const color = colors[Math.floor(Math.random() * colors.length)];
    const rot = (Math.random() * 720 - 360).toFixed(0) + 'deg';
    el.style.cssText = `
      left:${cx}px; top:${cy}px;
      background:${color};
      --cf-x:${dx.toFixed(0)}px;
      --cf-y:${dy.toFixed(0)}px;
      --cf-r:${rot};
      --cf-dur:${dur.toFixed(2)}s;
      width:${4 + Math.random() * 6}px;
      height:${4 + Math.random() * 6}px;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), dur * 1000 + 100);
  }
}

// Seasonal emoji burst. Items are constant emoji or the constant candy-cane SVG.
export function emojiBurst(from: HTMLElement, emojis: string[]) {
  const rect = from.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 16; i++) {
    const el = document.createElement('div');
    el.className = 'spook-piece';
    el.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 160;
    const dur = 1.1 + Math.random() * 0.8;
    el.style.cssText = `
      left:${cx}px; top:${cy}px;
      font-size:${18 + Math.random() * 22}px;
      --cf-x:${(Math.cos(angle) * dist).toFixed(0)}px;
      --cf-y:${(Math.sin(angle) * dist - 50).toFixed(0)}px;
      --cf-r:${(Math.random() * 120 - 60).toFixed(0)}deg;
      --cf-dur:${dur.toFixed(2)}s;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), dur * 1000 + 100);
  }
}

/** Theme-appropriate celebration burst from an element (used on every reveal). */
export function celebrate(from: HTMLElement) {
  if (isHalloween()) emojiBurst(from, ['🎃', '🎃', '🎃', '👻', '🦇', '🕷️', '💀', '🍬']);
  else if (isChristmas()) emojiBurst(from, ['❄️', '❄️', '⛄', '🎁', '⭐', '🔔', '🎄', CANDY_CANE_SVG]);
  else confettiBurst(from);
}

/** Restart a one-shot CSS animation class on an element. */
export function restartClass(el: HTMLElement, cls: string) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export function shake(el: HTMLElement) {
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'shake 0.4s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}
