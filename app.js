/* ── Bingo Caller — app.js ───────────────────── */

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────
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
    setupPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
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
    rollerLabel.textContent = 'Ready to call!';
    callBtn.disabled = false;
    callBtn.classList.remove('rolling');

    // Remove any lingering all-called message
    const msg = gamePanel.querySelector('.all-called-msg');
    if (msg) msg.remove();
  }

  // ── Reset ───────────────────────────────────
  resetBtn.addEventListener('click', () => {
    gamePanel.classList.add('hidden');
    setupPanel.classList.remove('hidden');
    // Reset input to reflect last used max
    maxNumberInput.value = maxNumber;
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

    rollerLabel.textContent = 'Calling…';
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

    // Light up board cell
    const cell = document.getElementById(`cell-${n}`);
    if (cell) {
      cell.classList.add('lit', 'just-called');
      cell.addEventListener('animationend', () => cell.classList.remove('just-called'), { once: true });
    }

    // Confetti burst from roller
    confettiBurst();

    isRolling = false;
    callBtn.classList.remove('rolling');

    if (pool.length === 0) {
      callBtn.disabled = true;
      rollerLabel.textContent = '🎉 All numbers called!';
      const msg = document.createElement('div');
      msg.className = 'all-called-msg';
      msg.textContent = '🎉 Every number has been called — BINGO!';
      const statsRow = gamePanel.querySelector('.stats-row');
      statsRow.insertAdjacentElement('afterend', msg);
    } else {
      callBtn.disabled = false;
    }
  }

  // ── Confetti ──────────────────────────────────
  const CONFETTI_COLORS = ['#f5c842','#ff3fa4','#00e5ff','#ff8c00','#a3ff00'];
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
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
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

  function numberToWords(n) {
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
