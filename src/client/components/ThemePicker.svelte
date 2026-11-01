<script lang="ts">
  import { THEMES, theme, pickTheme, isHalloween, isChristmas } from '../lib/themes';
  import { muted, toggleMuted, SpookySound, JingleSound } from '../lib/sounds';

  let { showThemes = true }: { showThemes?: boolean } = $props();
  let open = $state(false);

  function onDocClick() { open = false; }

  function toggleSound(e: MouseEvent) {
    e.stopPropagation();
    if (!toggleMuted()) {
      if (isHalloween()) SpookySound.ghost();
      if (isChristmas()) JingleSound.preview();
    }
  }
</script>

<svelte:document onclick={onDocClick} />

<div class="theme-picker">
  {#if showThemes}
  <button
    type="button"
    class="theme-toggle-btn"
    class:open
    aria-label="Choose theme"
    aria-expanded={open}
    onclick={(e) => { e.stopPropagation(); open = !open; }}
  >🎨</button>
  {/if}
  <button
    type="button"
    class="sound-toggle-btn"
    aria-label={$muted ? 'Turn sound effects on' : 'Turn sound effects off'}
    aria-pressed={!$muted}
    onclick={toggleSound}
  >{$muted ? '🔇' : '🔊'}</button>
  <div class="theme-options" class:open={open && showThemes}>
    {#each THEMES as t (t.id)}
      <button
        type="button"
        class="theme-swatch-btn"
        class:selected={$theme === t.id}
        aria-pressed={$theme === t.id}
        onclick={() => { pickTheme(t.id); open = false; }}
      >
        <span class="swatch-dot" style:background={t.swatch}></span>
        <span class="swatch-name">{t.label}</span>
      </button>
    {/each}
  </div>
</div>
