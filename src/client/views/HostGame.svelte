<script lang="ts">
  // Host game screen: the caller (roller, CALL NUMBER, board) plus a players panel.
  // Stages, claims, points and lock arrive in milestone 4.
  import Caller from '../components/Caller.svelte';
  import Roster from '../components/Roster.svelte';
  import ConnectionBadge from '../components/ConnectionBadge.svelte';
  import { STAGE_NAMES } from '../../shared/ticket';
  import { MAX_NUMBER } from '../../shared/protocol';
  import type { HostController } from '../lib/host.svelte';

  let { host }: { host: HostController } = $props();
  let confirmEnd = $state(false);
  const online = $derived(host.players.filter(p => p.online).length);
</script>

<div class="app game-active">
  <div class="panel game-panel fade-in">
    {#key host.syncKey}
      <Caller
        max={MAX_NUMBER}
        initialCalled={host.called}
        onCalled={n => host.call(n)}
        disabled={host.status !== 'open'}
        disabledLabel="RECONNECTING…"
      />
    {/key}
  </div>

  <div class="panel host-side fade-in">
    <div class="host-side-head">
      <p class="stage-pill">Playing for: <strong>{STAGE_NAMES[host.stage]}</strong></p>
      <p class="hint">Join code <strong class="inline-code">{host.code}</strong></p>
      <ConnectionBadge status={host.status} />
    </div>
    <h2 class="board-title">Players <span class="count">{online} online · {host.players.length} joined</span></h2>
    <Roster players={host.players} onKick={id => host.kick(id)} />
    <div class="lobby-actions">
      {#if !confirmEnd}
        <button type="button" class="btn btn-reset" onclick={() => (confirmEnd = true)}>End game</button>
      {:else}
        <div class="confirm" role="alertdialog" aria-label="Confirm end game">
          <span>End the game for everyone and delete it?</span>
          <button type="button" class="btn btn-danger btn-small" onclick={() => host.endGame()}>Yes, end it</button>
          <button type="button" class="btn btn-small" onclick={() => (confirmEnd = false)}>Cancel</button>
        </div>
      {/if}
    </div>
  </div>
</div>
