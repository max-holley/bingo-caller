<script lang="ts">
  import Header from '../components/Header.svelte';
  import type { LeaderboardEntry } from '../../shared/protocol';

  let { leaderboard, onHome }: { leaderboard: LeaderboardEntry[]; onHome: () => void } = $props();
</script>

<div class="app">
  <Header subtitle="Game over" />
  <div class="panel setup-panel fade-in">
    <h2 class="board-title">Final scoreboard</h2>
    {#if leaderboard.length === 0}
      <p class="hint">No players this time.</p>
    {:else}
      <ol class="leaderboard">
        {#each leaderboard as e, i (i)}
          <li><span class="lb-name">{e.name}</span><span class="lb-points">{e.points} pts</span></li>
        {/each}
      </ol>
    {/if}
    <p class="hint">This game has been deleted.</p>
    <!-- PostGameSlot / SupportLink: milestone 5 -->
    <button type="button" class="btn btn-start" onclick={onHome}>Done</button>
  </div>
</div>
