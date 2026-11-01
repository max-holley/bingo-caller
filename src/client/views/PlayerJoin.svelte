<script lang="ts">
  import { untrack } from 'svelte';
  import Header from '../components/Header.svelte';
  import { normaliseCode } from '../../shared/code';
  import { sanitizeName, NAME_MAX } from '../../shared/names';
  import { PlayerController } from '../lib/player.svelte';
  import { errorText } from '../lib/errors';

  let { initialCode = '', onJoined, onBack }: {
    initialCode?: string; onJoined: (p: PlayerController) => void; onBack: () => void;
  } = $props();

  let codeInput = $state(untrack(() => initialCode));
  let name = $state('');
  let error = $state<string | null>(null);
  let pending = $state<PlayerController | null>(null);

  $effect(() => {
    const p = pending;
    if (!p) return;
    if (p.joined) { onJoined(p); pending = null; return; }
    if (p.joinError) { error = errorText(p.joinError); p.dispose(); pending = null; return; }
    if (p.end) { error = errorText(p.end.kind === 'gone' ? p.end.code : 'no_room'); pending = null; }
  });

  function submit(e: SubmitEvent) {
    e.preventDefault();
    error = null;
    const code = normaliseCode(codeInput);
    if (!code) { error = 'Game codes are 6 letters and numbers, for example ABC234.'; return; }
    const clean = sanitizeName(name);
    if (!clean) { error = errorText('bad_name'); return; }
    pending = new PlayerController({ code, name: clean });
  }
</script>

<div class="app">
  <Header subtitle="Join a game" />
  <form class="panel setup-panel join-form fade-in" onsubmit={submit} novalidate>
    <label class="field-label" for="code">Game code</label>
    <input id="code" class="text-input code-input" autocomplete="off" autocapitalize="characters" spellcheck="false"
      maxlength="9" bind:value={codeInput} placeholder="ABC234" />

    <p class="jit-notice" id="name-notice">
      Use a nickname, not your full name. The host can see your name, and everyone sees it on the
      final scoreboard. It's deleted when the game ends.
      <!-- Privacy notice link: milestone 5 -->
    </p>
    <label class="field-label" for="name">Your nickname</label>
    <input id="name" class="text-input" autocomplete="off" maxlength={NAME_MAX * 2} bind:value={name}
      aria-describedby="name-notice" placeholder="e.g. Lucky Star" />

    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    <button type="submit" class="btn btn-start" disabled={!!pending}>{pending ? 'Joining…' : 'Join game'}</button>
    <button type="button" class="link-btn" onclick={onBack}>← Back</button>
  </form>
</div>
