<script lang="ts">
  // Host game → (pre-game slot, milestone 5) → choose theme → create room → lobby.
  import Header from '../components/Header.svelte';
  import { THEMES, theme, pickTheme, type ThemeId } from '../lib/themes';
  import { createRoom, ApiError } from '../lib/api';
  import { errorText } from '../lib/errors';
  import { saveSession, type HostSession } from '../lib/session';

  let { onCreated, onBack }: { onCreated: (s: HostSession) => void; onBack: () => void } = $props();

  let busy = $state(false);
  let error = $state<string | null>(null);

  async function create() {
    busy = true;
    error = null;
    try {
      const r = await createRoom($theme as ThemeId);
      const s: HostSession = { v: 1, role: 'host', code: r.code, hostKey: r.hostKey, expiresAt: r.expiresAt };
      saveSession(s);
      onCreated(s);
    } catch (e) {
      error = errorText(e instanceof ApiError ? e.code : 'error');
      busy = false;
    }
  }
</script>

<div class="app">
  <Header subtitle="Host a game" />
  <div class="panel setup-panel fade-in">
    <h2 class="field-label" id="theme-label">Choose a theme</h2>
    <div class="theme-grid" role="group" aria-labelledby="theme-label">
      {#each THEMES as t (t.id)}
        <button type="button" class="theme-swatch-btn" class:selected={$theme === t.id}
          aria-pressed={$theme === t.id} onclick={() => pickTheme(t.id)}>
          <span class="swatch-dot" style:background={t.swatch}></span>
          <span class="swatch-name">{t.label}</span>
        </button>
      {/each}
    </div>
    <p class="hint">90-ball bingo. You call the numbers; players join on their own phones.</p>
    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    <button type="button" class="btn btn-start" onclick={create} disabled={busy}>
      {busy ? 'Creating…' : 'Create game'}
    </button>
    <button type="button" class="link-btn" onclick={onBack}>← Back</button>
  </div>
</div>
