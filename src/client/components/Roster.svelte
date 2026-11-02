<script lang="ts">
  import type { PlayerSummary } from '../../shared/protocol';
  import Confirm from './Confirm.svelte';
  import { fade, scale } from 'svelte/transition';
  import { ms } from '../lib/motion';
  let {
    players, onKick, claimants, onOpenClaim, showPoints = false,
  }: {
    players: PlayerSummary[];
    onKick?: (id: string) => void;
    /** Player ids with a claim waiting: their names pulse and open the claim. */
    claimants?: ReadonlySet<string>;
    onOpenClaim?: (id: string) => void;
    showPoints?: boolean;
  } = $props();

  let confirming = $state<string | null>(null);
</script>

{#if players.length === 0}
  <p class="hint">Waiting for players to join…</p>
{:else}
  <ul class="roster">
    {#each players as p (p.id)}
      {@const claiming = claimants?.has(p.id) ?? false}
      <li class="roster-item" class:offline={!p.online} class:claiming in:scale={{ duration: ms(200), start: 0.92 }} out:fade={{ duration: ms(160) }}>
        <span class="dot" aria-hidden="true"></span>
        {#if claiming && onOpenClaim}
          <button type="button" class="roster-name roster-claim" onclick={() => onOpenClaim(p.id)}>🔔 {p.name}</button>
        {:else}
          <span class="roster-name">{p.name}</span>
        {/if}
        <span class="roster-state">{showPoints ? `${p.points} pts` : ''}{showPoints ? ' · ' : ''}{p.online ? 'online' : 'away'}</span>
        {#if onKick}
          <button type="button" class="roster-kick" aria-label={`Remove ${p.name} from the game`} title="Remove from game"
            aria-expanded={confirming === p.id} onclick={() => (confirming = confirming === p.id ? null : p.id)}>✕</button>
          <Confirm compact bind:open={() => confirming === p.id, v => { if (!v && confirming === p.id) confirming = null; }}
            message={`Remove ${p.name}?`} confirmLabel="Remove" onConfirm={() => onKick(p.id)} />
        {/if}
      </li>
    {/each}
  </ul>
{/if}
