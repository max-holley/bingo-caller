<script lang="ts">
  // The caller: roller, CALL NUMBER, stats and called-numbers board.
  // Ported from the original app.js. Used by Quick caller now and by the host view later.
  import { onDestroy, untrack, type Snippet } from 'svelte';
  import { numberToWords } from '../lib/calls';
  import { isChristmas, isHalloween } from '../lib/themes';
  import { SpookySound, JingleSound, ClassicSound } from '../lib/sounds';
  import { celebrate, restartClass } from '../lib/effects';
  import { shuffle } from '../lib/random';

  let {
    max,
    initialCalled = [],
    onCalled,
    onReset,
    resetLabel = '↺ New Game',
    disabled = false,
    disabledLabel,
    extraControls,
  }: {
    max: number;
    initialCalled?: number[];
    onCalled?: (n: number) => void;
    onReset?: () => void;
    resetLabel?: string;
    /** Block calling (e.g. while the host is reconnecting) without losing the board. */
    disabled?: boolean;
    disabledLabel?: string;
    extraControls?: Snippet;
  } = $props();

  // ── State ───────────────────────────────────
  // Pool = numbers not yet called, shuffled; rebuilt from the called list so a host can resume.
  // `max` and `initialCalled` are read once: the parent remounts this component for a new game.
  let called = $state(untrack(() => new Set<number>(initialCalled)));
  let pool = untrack(() => shuffle(Array.from({ length: max }, (_, i) => i + 1).filter(n => !called.has(n))));
  let isRolling = $state(false);
  let display = $state<string | number>('?');
  let displayLit = $state(false);
  let label = $state(
    isHalloween() ? 'Ready to summon… 🎃' : isChristmas() ? 'Ready to unwrap… 🎁' : 'Ready to call!'
  );
  let allCalledMsg = $state<string | null>(null);
  let justCalled = $state<number | null>(null);

  let rollerEl = $state<HTMLElement>()!;
  let trackEl = $state<HTMLElement>()!;
  let timer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(timer));

  const remaining = $derived(max - called.size);
  const numbers = $derived(Array.from({ length: max }, (_, i) => i + 1));

  function call() {
    if (isRolling || disabled || pool.length === 0) return;
    isRolling = true;
    const chosen = pool.pop()!; // take from shuffled pool

    label = isHalloween() ? 'Summoning…' : isChristmas() ? 'Unwrapping…' : 'Calling…';
    if (isHalloween()) SpookySound.roll();
    else if (isChristmas()) JingleSound.roll();
    else ClassicSound.roll();
    startRollerAnimation(chosen, () => reveal(chosen));
  }

  // Rapidly cycles through random numbers for ~2 seconds, then reveals the real one.
  function startRollerAnimation(_finalNumber: number, onComplete: () => void) {
    const DURATION_MS = 2000;
    const START_INTERVAL = 60;  // fast at start
    const END_INTERVAL = 180;   // slows at end
    let elapsed = 0;

    function tick() {
      if (elapsed >= DURATION_MS) {
        rollerEl.classList.remove('rolling-flash');
        onComplete();
        return;
      }
      // Show a random number that hasn't been called (for visual flavour)
      let fake: number;
      do { fake = Math.floor(Math.random() * max) + 1; }
      while (called.has(fake) && called.size < max - 1);

      display = fake;
      rollerEl.classList.add('rolling-flash');

      const progress = Math.min(elapsed / DURATION_MS, 1);
      const next = START_INTERVAL + (END_INTERVAL - START_INTERVAL) * progress * progress;
      elapsed += next;
      timer = setTimeout(tick, next);
    }
    tick();
  }

  function reveal(n: number) {
    called = new Set(called).add(n);

    rollerEl.classList.remove('rolling-flash');
    display = n;
    displayLit = true;
    restartClass(rollerEl, 'reveal');

    label = numberToWords(n);

    if (isHalloween()) { SpookySound.reveal(); restartClass(trackEl, 'lightning'); }
    else if (isChristmas()) { JingleSound.reveal(); restartClass(trackEl, 'twinkle'); }
    else ClassicSound.reveal();

    justCalled = n;
    celebrate(rollerEl);
    isRolling = false;
    onCalled?.(n);

    if (pool.length === 0) {
      const spooky = isHalloween(), festive = isChristmas();
      label = spooky ? '🎃 All numbers called!' : festive ? '🎄 All numbers called!' : '🎉 All numbers called!';
      allCalledMsg = spooky ? '🎃 Every number has been called — BOO-NGO! 👻'
                   : festive ? '🎄 Every number has been called — HO-HO-HO-NGO! ⛄'
                   : '🎉 Every number has been called — BINGO!';
      if (spooky) SpookySound.cackle();
      if (festive) JingleSound.finale();
      if (!spooky && !festive) ClassicSound.finale();
    }
  }
</script>

<div class="game-left">
  <div class="roller-wrap">
    <div class="roller-track" bind:this={trackEl}>
      <div
        class="roller-number"
        bind:this={rollerEl}
        style:color={displayLit ? 'var(--neon-gold)' : null}
        aria-live="polite"
        aria-atomic="true"
      >{display}</div>
    </div>
    <div class="roller-label">{label}</div>
  </div>

  <div class="game-controls">
    <button
      type="button"
      class="btn btn-call"
      class:rolling={isRolling}
      disabled={isRolling || disabled || remaining === 0}
      onclick={call}
    >
      <span class="btn-inner">{disabled && disabledLabel ? disabledLabel : 'CALL NUMBER'}</span>
    </button>
    {#if onReset}
      <button type="button" class="btn btn-reset" onclick={onReset}>{resetLabel}</button>
    {/if}
  </div>

  <div class="stats-row">
    <div class="stat">
      <span class="stat-val">{called.size}</span>
      <span class="stat-lbl">Called</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat">
      <span class="stat-val">{remaining}</span>
      <span class="stat-lbl">Remaining</span>
    </div>
  </div>

  {#if allCalledMsg}
    <div class="all-called-msg">{allCalledMsg}</div>
  {/if}

  {@render extraControls?.()}
</div>

<div class="board-section">
  <h2 class="board-title">Called Numbers</h2>
  <div class="board">
    {#each numbers as n (n)}
      <div
        class="board-cell"
        class:lit={called.has(n)}
        class:just-called={justCalled === n}
        onanimationend={() => { if (justCalled === n) justCalled = null; }}
        aria-label={called.has(n) ? `${n}, called` : `${n}, not called`}
      >{n}</div>
    {/each}
  </div>
</div>
