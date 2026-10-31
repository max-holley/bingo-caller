/* ── Bingo Caller — app.js ───────────────────── */

(function () {
  'use strict';

  // ── Themes ──────────────────────────────────
  const THEMES = [
    { id: 'midnight', label: 'Midnight', swatch: 'conic-gradient(#f5c842 120deg, #ff3fa4 120deg 240deg, #00e5ff 240deg)' },
    { id: 'ocean',    label: 'Ocean',    swatch: 'conic-gradient(#00cfb5 120deg, #0099ff 120deg 240deg, #6cffbe 240deg)' },
    { id: 'sunset',   label: 'Sunset',   swatch: 'conic-gradient(#ff8c00 120deg, #ff2d55 120deg 240deg, #ffd600 240deg)' },
    { id: 'forest',   label: 'Forest',   swatch: 'conic-gradient(#2dff6e 120deg, #00e5a0 120deg 240deg, #b8ff3f 240deg)' },
    { id: 'aurora',   label: 'Aurora',   swatch: 'conic-gradient(#b46fff 120deg, #ff4fe0 120deg 240deg, #4de8ff 240deg)' },
    { id: 'halloween', label: 'Halloween 🎃', swatch: 'conic-gradient(#ff7a00 120deg, #9b30ff 120deg 240deg, #7dff3a 240deg)' },
  ];
  const THEME_KEY = 'bingo-theme';
  const HALLOWEEN_OPTOUT_KEY = 'bingo-halloween-optout'; // year the user picked another theme mid-season

  // Halloween is the automatic default every year from 26–31 October.
  function isHalloweenSeason(d = new Date()) {
    return d.getMonth() === 9 && d.getDate() >= 26;
  }

  function isHalloween() {
    return document.documentElement.dataset.theme === 'halloween';
  }

  function applyTheme(id, persist = true) {
    document.documentElement.dataset.theme = id === 'midnight' ? '' : id;
    if (persist) localStorage.setItem(THEME_KEY, id);
    document.querySelectorAll('.theme-swatch-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.themeId === id);
    });
  }

  function pickTheme(id) {
    if (isHalloweenSeason()) {
      const year = String(new Date().getFullYear());
      if (id === 'halloween') {
        // Seasonal default — don't overwrite the user's normal theme
        localStorage.removeItem(HALLOWEEN_OPTOUT_KEY);
        applyTheme(id, false);
        return;
      }
      localStorage.setItem(HALLOWEEN_OPTOUT_KEY, year);
    }
    applyTheme(id);
  }

  (function initThemePicker() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'midnight';
    const optedOut   = localStorage.getItem(HALLOWEEN_OPTOUT_KEY) === String(new Date().getFullYear());

    const toggleBtn  = document.getElementById('themeToggleBtn');
    const optionsEl  = document.getElementById('themeOptions');

    THEMES.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'theme-swatch-btn';
      btn.dataset.themeId = t.id;
      btn.innerHTML = `<span class="swatch-dot" style="background:${t.swatch}"></span><span class="swatch-name">${t.label}</span>`;
      btn.addEventListener('click', () => {
        pickTheme(t.id);
        optionsEl.classList.remove('open');
        toggleBtn.classList.remove('open');
      });
      optionsEl.appendChild(btn);
    });

    if (isHalloweenSeason() && !optedOut) applyTheme('halloween', false);
    else applyTheme(savedTheme, false);

    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = optionsEl.classList.toggle('open');
      toggleBtn.classList.toggle('open', isOpen);
    });

    document.addEventListener('click', () => {
      optionsEl.classList.remove('open');
      toggleBtn.classList.remove('open');
    });
  })();

  // ── DOM refs ────────────────────────────────
  const appEl         = document.querySelector('.app');
  const header        = document.querySelector('.header');
  const setupPanel    = document.getElementById('setupPanel');
  const gamePanel     = document.getElementById('gamePanel');
  const maxNumberInput= document.getElementById('maxNumber');
  const stepDownBtn   = document.getElementById('stepDown');
  const stepUpBtn     = document.getElementById('stepUp');
  const startBtn      = document.getElementById('startBtn');
  const callBtn       = document.getElementById('callBtn');
  const resetBtn      = document.getElementById('resetBtn');
  const rollerDisplay = document.getElementById('rollerDisplay');
  const rollerLabel   = document.getElementById('rollerLabel');
  const board         = document.getElementById('board');
  const calledCountEl = document.getElementById('calledCount');
  const remainingEl   = document.getElementById('remainingCount');

  // ── State ───────────────────────────────────
  let maxNumber   = 90;
  let pool        = [];      // numbers not yet called
  let called      = new Set();
  let isRolling   = false;

  // ── Starfield ───────────────────────────────
  (function buildStars() {
    const sf = document.getElementById('starfield');
    const count = 80;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('div');
      s.className = 'star';
      const size = Math.random() * 2.5 + 0.5;
      s.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random()*100}%;
        top:${Math.random()*100}%;
        --d:${(Math.random()*4+2).toFixed(1)}s;
        --o:${(Math.random()*0.5+0.2).toFixed(2)};
        animation-delay:${(Math.random()*5).toFixed(1)}s;
      `;
      sf.appendChild(s);
    }
  })();

  // ── Halloween decorations (hidden by CSS unless theme is active) ──
  (function buildSpookLayer() {
    const layer = document.getElementById('spookLayer');
    if (!layer) return;
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
  })();

  // ── Stepper buttons ─────────────────────────
  stepDownBtn.addEventListener('click', () => {
    const v = parseInt(maxNumberInput.value, 10);
    if (v > 10) maxNumberInput.value = v - 1;
  });
  stepUpBtn.addEventListener('click', () => {
    const v = parseInt(maxNumberInput.value, 10);
    if (v < 999) maxNumberInput.value = v + 1;
  });

  // ── Start game ──────────────────────────────
  startBtn.addEventListener('click', () => {
    const val = parseInt(maxNumberInput.value, 10);
    if (isNaN(val) || val < 10) {
      shake(maxNumberInput);
      return;
    }
    maxNumber = Math.min(Math.max(val, 10), 999);
    initGame();

    header.classList.add('fade-out');
    setupPanel.classList.add('fade-out');

    setTimeout(() => {
      header.classList.add('hidden');
      setupPanel.classList.add('hidden');
      header.classList.remove('fade-out');
      setupPanel.classList.remove('fade-out');

      appEl.classList.add('game-active');
      gamePanel.classList.remove('hidden');
      void gamePanel.offsetWidth;
      gamePanel.classList.add('fade-in');
      gamePanel.addEventListener('animationend', () => gamePanel.classList.remove('fade-in'), { once: true });
    }, 380);
  });

  function initGame() {
    pool   = Array.from({ length: maxNumber }, (_, i) => i + 1);
    called = new Set();
    shufflePool();
    buildBoard();
    updateStats();
    rollerDisplay.textContent = '?';
    rollerDisplay.style.color = '';
    rollerDisplay.classList.remove('rolling-flash', 'reveal');
    rollerLabel.textContent = isHalloween() ? 'Ready to summon… 🎃' : 'Ready to call!';
    callBtn.disabled = false;
    callBtn.classList.remove('rolling');

    // Remove any lingering all-called message
    const msg = gamePanel.querySelector('.all-called-msg');
    if (msg) msg.remove();
  }

  // ── Reset ───────────────────────────────────
  resetBtn.addEventListener('click', () => {
    gamePanel.classList.add('fade-out');

    setTimeout(() => {
      gamePanel.classList.add('hidden');
      gamePanel.classList.remove('fade-out');

      appEl.classList.remove('game-active');

      header.classList.remove('hidden');
      setupPanel.classList.remove('hidden');
      void header.offsetWidth;
      header.classList.add('fade-in');
      setupPanel.classList.add('fade-in');
      header.addEventListener('animationend', () => header.classList.remove('fade-in'), { once: true });
      setupPanel.addEventListener('animationend', () => setupPanel.classList.remove('fade-in'), { once: true });

      maxNumberInput.value = maxNumber;
    }, 380);
  });

  // ── Build number board ───────────────────────
  function buildBoard() {
    board.innerHTML = '';
    for (let n = 1; n <= maxNumber; n++) {
      const cell = document.createElement('div');
      cell.className = 'board-cell';
      cell.textContent = n;
      cell.id = `cell-${n}`;
      board.appendChild(cell);
    }
  }

  // ── Shuffle (Fisher-Yates) ───────────────────
  function shufflePool() {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }

  // ── Update stats display ─────────────────────
  function updateStats() {
    calledCountEl.textContent = called.size;
    remainingEl.textContent   = maxNumber - called.size;
  }

  // ── Call a number ────────────────────────────
  callBtn.addEventListener('click', () => {
    if (isRolling || pool.length === 0) return;
    isRolling = true;
    callBtn.disabled = true;
    callBtn.classList.add('rolling');

    const chosenNumber = pool.pop();   // take from shuffled pool

    rollerLabel.textContent = isHalloween() ? 'Summoning…' : 'Calling…';
    if (isHalloween()) SpookySound.roll();
    startRollerAnimation(chosenNumber, () => {
      revealNumber(chosenNumber);
    });
  });

  // ── Roller animation ─────────────────────────
  // Rapidly cycles through random numbers for ~2 seconds, then reveals the real one.
  function startRollerAnimation(finalNumber, onComplete) {
    const DURATION_MS  = 2000;
    const START_INTERVAL = 60;   // fast at start
    const END_INTERVAL   = 180;  // slows at end

    let elapsed = 0;

    function tick(interval) {
      if (elapsed >= DURATION_MS) {
        rollerDisplay.classList.remove('rolling-flash');
        onComplete();
        return;
      }
      // Show a random number that hasn't been called (for visual flavour)
      const fakeRange = maxNumber;
      let fake;
      do { fake = Math.floor(Math.random() * fakeRange) + 1; }
      while (called.has(fake) && called.size < maxNumber - 1);

      rollerDisplay.textContent = fake;
      rollerDisplay.classList.add('rolling-flash');

      // Progress ratio: ease in to slower speed
      const progress  = Math.min(elapsed / DURATION_MS, 1);
      const nextInterval = START_INTERVAL + (END_INTERVAL - START_INTERVAL) * easeInQuad(progress);

      elapsed += nextInterval;
      setTimeout(() => tick(nextInterval), nextInterval);
    }

    tick(START_INTERVAL);
  }

  function easeInQuad(t) { return t * t; }

  // ── Reveal the final number ──────────────────
  function revealNumber(n) {
    called.add(n);
    updateStats();

    // Update roller display
    rollerDisplay.classList.remove('rolling-flash');
    rollerDisplay.textContent = n;
    rollerDisplay.style.color = 'var(--neon-gold)';

    // Force reflow to restart animation
    void rollerDisplay.offsetWidth;
    rollerDisplay.classList.add('reveal');

    rollerLabel.textContent = numberToWords(n);

    if (isHalloween()) {
      SpookySound.reveal();
      const track = document.getElementById('rollerTrack');
      track.classList.remove('lightning');
      void track.offsetWidth;
      track.classList.add('lightning');
    }

    // Light up board cell
    const cell = document.getElementById(`cell-${n}`);
    if (cell) {
      cell.classList.add('lit', 'just-called');
      cell.addEventListener('animationend', () => cell.classList.remove('just-called'), { once: true });
    }

    // Confetti burst from roller (pumpkins & ghosts at Halloween)
    if (isHalloween()) spookyBurst();
    else confettiBurst();

    isRolling = false;
    callBtn.classList.remove('rolling');

    if (pool.length === 0) {
      callBtn.disabled = true;
      const spooky = isHalloween();
      rollerLabel.textContent = spooky ? '🎃 All numbers called!' : '🎉 All numbers called!';
      const msg = document.createElement('div');
      msg.className = 'all-called-msg';
      msg.textContent = spooky ? '🎃 Every number has been called — BOO-NGO! 👻' : '🎉 Every number has been called — BINGO!';
      if (spooky) SpookySound.cackle();
      const statsRow = gamePanel.querySelector('.stats-row');
      statsRow.insertAdjacentElement('afterend', msg);
    } else {
      callBtn.disabled = false;
    }
  }

  // ── Confetti ──────────────────────────────────
  function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return [
      s.getPropertyValue('--neon-gold').trim(),
      s.getPropertyValue('--neon-pink').trim(),
      s.getPropertyValue('--neon-cyan').trim(),
      '#ff8c00', '#a3ff00',
    ];
  }
  function confettiBurst() {
    const rect = rollerDisplay.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const count = 28;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const dist  = 80 + Math.random() * 140;
      const dx    = Math.cos(angle) * dist;
      const dy    = Math.sin(angle) * dist - 60;
      const dur   = 0.8 + Math.random() * 0.7;
      const colors = getThemeColors();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const rot   = (Math.random() * 720 - 360).toFixed(0) + 'deg';
      el.style.cssText = `
        left:${cx}px; top:${cy}px;
        background:${color};
        --cf-x:${dx.toFixed(0)}px;
        --cf-y:${dy.toFixed(0)}px;
        --cf-r:${rot};
        --cf-dur:${dur.toFixed(2)}s;
        width:${4 + Math.random()*6}px;
        height:${4 + Math.random()*6}px;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), dur * 1000 + 100);
    }
  }

  // ── Halloween emoji burst ─────────────────────
  function spookyBurst() {
    const rect = rollerDisplay.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const emojis = ['🎃', '🎃', '🎃', '👻', '🦇', '🕷️', '💀', '🍬'];
    for (let i = 0; i < 16; i++) {
      const el = document.createElement('div');
      el.className = 'spook-piece';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist  = 90 + Math.random() * 160;
      const dur   = 1.1 + Math.random() * 0.8;
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

  // ── Spooky sound effects (synthesised with Web Audio — no files needed) ──
  const SpookySound = (function () {
    const MUTE_KEY = 'bingo-spooky-muted';
    let ctx = null;
    let muted = localStorage.getItem(MUTE_KEY) === '1';
    let last = -1;

    const toggleBtn = document.getElementById('soundToggleBtn');
    function renderToggle() { if (toggleBtn) toggleBtn.textContent = muted ? '🔇' : '🔊'; }
    renderToggle();
    if (toggleBtn) toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      muted = !muted;
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      renderToggle();
      if (!muted) ghost();
    });

    function audio() {
      if (muted) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
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
    function reveal() {
      let i;
      do { i = Math.floor(Math.random() * REVEALS.length); } while (i === last);
      last = i;
      REVEALS[i]();
    }

    return { roll, reveal, cackle, ghost };
  })();

  // ── Number flavour labels ─────────────────────
  // Classic bingo call names (for fun!) — falls back to plain "Number N"
  const CALLS = {
    1: "Kelly's Eye", 2: "One Little Duck", 3: "Cup of Tea",
    4: "Knock at the Door", 5: "Man Alive", 6: "Tom Mix",
    7: "Lucky Seven", 8: "One Fat Lady", 9: "Doctor's Orders",
    10: "Theresa's Den", 11: "Legs Eleven", 12: "One Dozen",
    13: "Unlucky for Some", 14: "Valentine's Day", 15: "Young and Keen",
    16: "Never Been Kissed", 17: "Dancing Queen", 18: "Coming of Age",
    19: "Goodbye Teens", 20: "One Score", 21: "Key of the Door",
    22: "Two Little Ducks", 23: "The Lord is My Shepherd", 24: "Two Dozen",
    25: "Duck and Dive", 26: "Pick and Mix", 27: "Gateway to Heaven",
    28: "Overweight", 29: "Rise and Shine", 30: "Dirty Gertie",
    31: "Get Up and Run", 32: "Buckle My Shoe", 33: "Dirty Knee",
    34: "Ask for More", 35: "Jump and Jive", 36: "Three Dozen",
    37: "More than Eleven", 38: "Christmas Cake", 39: "Steps",
    40: "Naughty Forty", 41: "Time for Fun", 42: "Winnie the Pooh",
    43: "Down on Your Knees", 44: "Droopy Drawers", 45: "Halfway There",
    46: "Up to Tricks", 47: "Four and Seven", 48: "Four Dozen",
    49: "PC", 50: "Half a Century", 51: "Tweak of the Thumb",
    52: "Danny La Rue", 53: "Stuck in the Tree", 54: "Clean the Floor",
    55: "Snakes Alive", 56: "Shotts Bus", 57: "Heinz Varieties",
    58: "Make Them Wait", 59: "Brighton Line", 60: "Five Dozen",
    61: "Baker's Bun", 62: "Tickety-boo", 63: "Tickle Me",
    64: "Red Raw", 65: "Old Age Pension", 66: "Clickety Click",
    67: "Made in Heaven", 68: "Saving Grace", 69: "Anyway Up",
    70: "Three Score and Ten", 71: "Bang on the Drum", 72: "Six Dozen",
    73: "Queen Bee", 74: "Hit the Floor", 75: "Strive and Strive",
    76: "Trombones", 77: "Sunset Strip", 78: "Heaven's Gate",
    79: "One More Time", 80: "Eight and Blank", 81: "Stop and Run",
    82: "Straight on Through", 83: "Time for Tea", 84: "Seven Dozen",
    85: "Staying Alive", 86: "Between the Sticks", 87: "Torquay in Devon",
    88: "Two Fat Ladies", 89: "Nearly There", 90: "Top of the Shop",
  };

  const SPOOKY_CALLS = {
    1: "One Lonely Ghost", 4: "Knock Knock — Who's There?", 7: "Seven Spooky Spiders",
    10: "Midnight Strikes Ten", 13: "Unlucky for Some 👻", 21: "Witch's Brew",
    31: "Halloween Night 🎃", 33: "Creepy Knees", 44: "Skeleton Doors",
    55: "Snakes in the Cauldron", 66: "Clickety Bones", 77: "Graveyard Strip",
    88: "Two Fat Pumpkins", 90: "Top of the Crypt",
  };

  function numberToWords(n) {
    if (isHalloween() && SPOOKY_CALLS[n]) return SPOOKY_CALLS[n];
    return CALLS[n] || `Number ${n}`;
  }

  // ── Utility: shake animation ─────────────────
  function shake(el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'shake 0.4s ease';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  }
  // Inline keyframe for shake (not in CSS file so it's self-contained)
  const shakeStyle = document.createElement('style');
  shakeStyle.textContent = `
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-8px); }
      40%      { transform: translateX(8px); }
      60%      { transform: translateX(-6px); }
      80%      { transform: translateX(6px); }
    }
  `;
  document.head.appendChild(shakeStyle);

})();
