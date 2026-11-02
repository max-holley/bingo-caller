<script lang="ts">
  import type { PlayerSummary } from '../../shared/protocol';
  let { players, onKick }: { players: PlayerSummary[]; onKick?: (id: string) => void } = $props();

  let confirming = $state<string | null>(null);
</script>

{#if players.length === 0}
  <p class="hint">Waiting for players to join…</p>
{:else}
  <ul class="roster">
    {#each players as p (p.id)}
      <li class="roster-item" class:offline={!p.online} class:confirming={confirming === p.id}>
        <span class="dot" aria-hidden="true"></span>
        {#if onKick && confirming === p.id}
          <span class="roster-name">Remove {p.name}?</span>
          <span class="roster-confirm" role="alertdialog" aria-label={`Remove ${p.name}?`}>
            <button type="button" class="btn btn-danger btn-small" onclick={() => { onKick(p.id); confirming = null; }}>Remove</button>
            <button type="button" class="btn btn-small" onclick={() => (confirming = null)}>Cancel</button>
          </span>
        {:else}
          <span class="roster-name">{p.name}</span>
          <span class="roster-state">{p.online ? 'online' : 'away'}</span>
          {#if onKick}
            <button type="button" class="roster-kick" aria-label={`Remove ${p.name} from the game`} title="Remove from game"
              onclick={() => (confirming = p.id)}>✕</button>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>
{/if}
