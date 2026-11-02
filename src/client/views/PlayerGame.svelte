<script lang="ts">
  // Player screen: last called number, recent calls, stage, points and the ticket.
  // Numbers are only ever marked by the player tapping them; uncalled numbers are refused.
  import Header from '../components/Header.svelte';
  import ConnectionBadge from '../components/ConnectionBadge.svelte';
  import { numberToWords } from '../lib/calls';
  import { restartClass, shake } from '../lib/effects';
  import { STAGE_NAMES } from '../../shared/ticket';
  import type { PlayerController } from '../lib/player.svelte';

  let { player, onLeave }: { player: PlayerController; onLeave: () => void } = $props();
  let confirmLeave = $state(false);
  let notCalled = $state<number | null>(null);
  let notCalledTimer: ReturnType<typeof setTimeout> | undefined;
  let lastEl = $state<HTMLElement>();

  const last = $derived(player.called.at(-1));
  const recent = $derived(player.called.slice(-6, -1).reverse());
  const calledSet = $derived(new Set(player.called));

  // Pop the big number whenever a new one arrives.
  $effect(() => {
    if (last !== undefined && lastEl) restartClass(lastEl, 'reveal');
  });

  function tap(n: number, el: HTMLElement) {
    if (player.toggle(n)) return;
    shake(el);
    notCalled = n;
    clearTimeout(notCalledTimer);
    notCalledTimer = setTimeout(() => (notCalled = null), 1600);
  }
</script>

<div class="app player-app">
  <Header subtitle={`Game ${player.code}`} />
  <div class="panel player-panel fade-in">
    <div class="player-top">
      <div class="last-call" aria-live="polite" aria-atomic="true">
        {#if last !== undefined}
          <span class="last-label">Last called</span>
          <span class="last-number" bind:this={lastEl}>{last}</span>
          <span class="last-words">{numberToWords(last)}</span>
        {:else if player.started}
          <span class="last-label">Game started</span>
          <span class="last-words">Waiting for the first number…</span>
        {:else}
          <span class="last-label">You're in, {player.name}!</span>
          <span class="last-words">Waiting for the host to start. Keep this page open.</span>
        {/if}
      </div>
      <div class="player-meta">
        <p class="stage-pill">Playing for: <strong>{STAGE_NAMES[player.stage]}</strong></p>
        <p class="hint"><strong class="player-name">{player.name}</strong> · {player.points} pts · {player.called.length} called</p>
      </div>
    </div>

    {#if recent.length}
      <div class="recent" aria-label="Previous numbers">
        <span class="recent-label">Before that</span>
        {#each recent as n (n)}<span class="recent-ball">{n}</span>{/each}
      </div>
    {/if}

    {#if player.ticket}
      <div class="ticket" role="group" aria-label="Your ticket">
        {#each player.ticket as row, r (r)}
          <div class="ticket-row">
            {#each row as n, c (c)}
              {#if n === 0}
                <span class="ticket-cell blank" aria-hidden="true"></span>
              {:else}
                <button
                  type="button"
                  class="ticket-cell"
                  class:marked={player.marks.has(n)}
                  class:called={calledSet.has(n) && !player.marks.has(n)}
                  aria-pressed={player.marks.has(n)}
                  aria-label={`${n}${player.marks.has(n) ? ', marked' : calledSet.has(n) ? ', called' : ''}`}
                  onclick={e => tap(n, e.currentTarget)}
                >{n}</button>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
      <p class="ticket-hint" aria-live="polite">
        {#if notCalled !== null}<span class="not-called">{notCalled} hasn't been called yet</span>
        {:else}Tap a number on your ticket when it's called.{/if}
      </p>
    {/if}

    <div class="player-foot">
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
</div>
