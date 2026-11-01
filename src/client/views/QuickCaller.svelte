<script lang="ts">
  // Quick caller (offline): the original single-device mode. No network at all.
  import Caller from '../components/Caller.svelte';
  import { shake } from '../lib/effects';

  let { onExit }: { onExit: () => void } = $props();

  type Phase = 'setup' | 'game';
  let phase = $state<Phase>('setup');
  let fading = $state(false);
  let entering = $state(true);
  let maxInput = $state('90');
  let maxNumber = $state(90);
  let gameKey = $state(0); // remount Caller for a fresh game
  let inputEl = $state<HTMLInputElement>();

  const FADE_MS = 380;

  function go(next: Phase) {
    fading = true;
    setTimeout(() => {
      fading = false;
      phase = next;
      entering = true;
    }, FADE_MS);
  }

  function step(d: number) {
    const v = parseInt(maxInput, 10);
    if (d < 0 && v > 10) maxInput = String(v - 1);
    if (d > 0 && v < 999) maxInput = String(v + 1);
  }

  function start() {
    const val = parseInt(maxInput, 10);
    if (isNaN(val) || val < 10) { if (inputEl) shake(inputEl); return; }
    maxNumber = Math.min(Math.max(val, 10), 999);
    gameKey++;
    go('game');
  }

  function reset() {
    maxInput = String(maxNumber);
    go('setup');
  }
</script>

<div class="app" class:game-active={phase === 'game'}>
  {#if phase === 'setup'}
    <header class="header" class:fade-out={fading} class:fade-in={entering} onanimationend={(e) => { if (e.target === e.currentTarget) entering = false; }}>
      <div class="logo-ring"></div>
      <h1 class="title">BINGO<span class="title-accent">!</span></h1>
      <p class="subtitle">Lucky Numbers Caller</p>
    </header>

    <div class="panel setup-panel" class:fade-out={fading} class:fade-in={entering}>
      <label class="field-label" for="maxNumber">Highest Number</label>
      <div class="number-input-row">
        <button type="button" class="stepper" aria-label="Decrease" onclick={() => step(-1)}>−</button>
        <input type="text" inputmode="numeric" pattern="[0-9]*" id="maxNumber" bind:value={maxInput} bind:this={inputEl} />
        <button type="button" class="stepper" aria-label="Increase" onclick={() => step(1)}>+</button>
      </div>
      <button type="button" class="btn btn-start" onclick={start}>Start Game</button>
      <button type="button" class="link-btn" onclick={onExit}>← Back</button>
    </div>
  {:else}
    <div class="panel game-panel" class:fade-out={fading} class:fade-in={entering} onanimationend={(e) => { if (e.target === e.currentTarget) entering = false; }}>
      {#key gameKey}
        <Caller max={maxNumber} onReset={reset} />
      {/key}
    </div>
  {/if}
</div>
