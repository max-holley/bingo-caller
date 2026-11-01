<script lang="ts">
  // Milestone 2: waiting room. Ticket, calls and marking arrive in milestone 3.
  import Header from '../components/Header.svelte';
  import ConnectionBadge from '../components/ConnectionBadge.svelte';
  import type { PlayerController } from '../lib/player.svelte';

  let { player, onLeave }: { player: PlayerController; onLeave: () => void } = $props();
  let confirmLeave = $state(false);
</script>

<div class="app">
  <Header subtitle={`Game ${player.code}`} />
  <div class="panel setup-panel fade-in">
    <p class="welcome-name">You're in, <strong>{player.name}</strong>!</p>
    <p class="hint">Waiting for the host to start. Keep this page open.</p>
    <ConnectionBadge status={player.status} />
    {#if !confirmLeave}
      <button type="button" class="link-btn" onclick={() => (confirmLeave = true)}>Leave game</button>
    {:else}
      <div class="confirm" role="alertdialog" aria-label="Confirm leave">
        <span>Leave and forget this game on this device?</span>
        <button type="button" class="btn btn-danger btn-small" onclick={() => { player.leave(); onLeave(); }}>Leave</button>
        <button type="button" class="btn btn-small" onclick={() => (confirmLeave = false)}>Stay</button>
      </div>
    {/if}
  </div>
</div>
