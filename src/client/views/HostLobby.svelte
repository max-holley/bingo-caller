<script lang="ts">
  import QrCode from '../components/QrCode.svelte';
  import Roster from '../components/Roster.svelte';
  import ConnectionBadge from '../components/ConnectionBadge.svelte';
  import type { HostController } from '../lib/host.svelte';

  let { host }: { host: HostController } = $props();

  const joinUrl = $derived(`${location.origin}/join/${host.code}`);
  let copied = $state(false);
  let confirmEnd = $state(false);

  async function copy() {
    try { await navigator.clipboard.writeText(joinUrl); copied = true; setTimeout(() => (copied = false), 2000); } catch { /* ignore */ }
  }
  const online = $derived(host.players.filter(p => p.online).length);
</script>

<div class="app game-active">
  <div class="panel lobby fade-in">
    <section class="lobby-join" aria-labelledby="join-h">
      <h2 class="board-title" id="join-h">Join this game</h2>
      <p class="code-label">Game code</p>
      <p class="room-code" aria-label={`Game code ${host.code.split('').join(' ')}`}>{host.code}</p>
      <QrCode text={joinUrl} label={`QR code linking to ${joinUrl}`} />
      <div class="join-link">
        <span class="join-url">{joinUrl}</span>
        <button type="button" class="btn btn-small" onclick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
      </div>
      <ConnectionBadge status={host.status} />
    </section>

    <section class="lobby-roster" aria-labelledby="roster-h">
      <h2 class="board-title" id="roster-h">Players <span class="count">{online} online · {host.players.length} joined</span></h2>
      <Roster players={host.players} onKick={id => host.kick(id)} />

      <div class="lobby-actions">
        <button type="button" class="btn btn-start" disabled title="Calling numbers arrives in the next milestone">Start game</button>
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
    </section>
  </div>
</div>
