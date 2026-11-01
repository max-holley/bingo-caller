<script lang="ts">
  import type { PlayerSummary } from '../../shared/protocol';
  let { players }: { players: PlayerSummary[] } = $props();
</script>

{#if players.length === 0}
  <p class="hint">Waiting for players to join…</p>
{:else}
  <ul class="roster">
    {#each players as p (p.id)}
      <li class="roster-item" class:offline={!p.online}>
        <span class="dot" aria-hidden="true"></span>
        <span class="roster-name">{p.name}</span>
        <span class="roster-state">{p.online ? 'online' : 'away'}</span>
      </li>
    {/each}
  </ul>
{/if}
