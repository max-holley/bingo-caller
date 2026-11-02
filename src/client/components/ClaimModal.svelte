<script lang="ts">
  // Host's view of one claim. The claim came from a player's device, so nothing in it is
  // trusted: the ticket is re-validated and every mark is checked against the host's own
  // called list before the pattern is counted.
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { ms } from '../lib/motion';
  import { isValidTicket, completeRows, ticketNumbers, STAGE_NAMES } from '../../shared/ticket';
  import type { ClaimView } from '../../shared/protocol';

  let {
    claim, called, defaultPoints, onAward, onDismiss, onClose,
  }: {
    claim: ClaimView;
    called: number[];
    defaultPoints: number;
    onAward: (points: number) => void;
    onDismiss: () => void;
    onClose: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let points = $state(String(defaultPoints));
  let dialog = $state<HTMLElement>();

  const calledSet = $derived(new Set(called));
  const ticketOk = $derived(isValidTicket(claim.ticket));
  const onTicket = $derived(new Set(ticketOk ? ticketNumbers(claim.ticket) : []));
  const uncalled = $derived(claim.marked.filter(n => !calledSet.has(n)));
  const good = $derived(new Set(claim.marked.filter(n => calledSet.has(n) && onTicket.has(n))));
  const rows = $derived(ticketOk ? completeRows(claim.ticket, good) : 0);
  const fullRows = $derived(ticketOk ? claim.ticket.map(r => r.every(n => n === 0 || good.has(n))) : []);
  const valid = $derived(ticketOk && rows >= claim.stage);
  const pointsNum = $derived(Math.max(0, Math.min(1000, Math.floor(Number(points)) || 0)));

  onMount(() => dialog?.focus());

  function key(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={key} />

<div class="modal-backdrop" onclick={onClose} role="presentation" transition:fade={{ duration: ms(180) }}>
  <div
    class="modal panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="claim-h"
    tabindex="-1"
    bind:this={dialog}
    onclick={e => e.stopPropagation()}
    onkeydown={e => e.stopPropagation()}
    transition:scale={{ duration: ms(200), start: 0.96, easing: cubicOut }}
  >
    <h2 id="claim-h" class="modal-title"><span class="claim-name">{claim.name}</span> claims {STAGE_NAMES[claim.stage]}</h2>

    {#if valid}
      <p class="verdict verdict-ok">✓ Valid: {rows} complete {rows === 1 ? 'row' : 'rows'} using called numbers.</p>
    {:else if !ticketOk}
      <p class="verdict verdict-bad">✗ Not valid: this isn't a proper bingo ticket.</p>
    {:else}
      <p class="verdict verdict-bad">✗ Not valid: only {rows} complete {rows === 1 ? 'row' : 'rows'} using called numbers; {STAGE_NAMES[claim.stage]} needs {claim.stage === 3 ? 'all 15 numbers' : claim.stage}.</p>
    {/if}
    {#if uncalled.length}
      <p class="verdict verdict-warn">⚠ Marked but not called: {uncalled.join(', ')}</p>
    {/if}

    {#if ticketOk}
      <div class="ticket ticket-static" aria-label={`${claim.name}'s ticket`}>
        {#each claim.ticket as row, r (r)}
          <div class="ticket-row" class:full={fullRows[r]}>
            {#each row as n, c (c)}
              {#if n === 0}
                <span class="ticket-cell blank"></span>
              {:else}
                <span
                  class="ticket-cell"
                  class:marked={good.has(n)}
                  class:bad={claim.marked.includes(n) && !calledSet.has(n)}
                  aria-label={`${n}${good.has(n) ? ', marked' : claim.marked.includes(n) ? ', marked but not called' : ''}`}
                >{n}</span>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    {/if}

    <div class="modal-actions">
      <label class="points-field">
        Points
        <input class="text-input points-input" type="number" min="0" max="1000" inputmode="numeric" bind:value={points} />
      </label>
      {#if valid}
        <button type="button" class="btn btn-start btn-award" onclick={() => onAward(pointsNum)}>Award {pointsNum}</button>
        <button type="button" class="btn btn-danger btn-small" onclick={onDismiss}>Dismiss</button>
      {:else}
        <!-- Dismiss is the obvious action; awarding anyway stays possible (the host is in charge). -->
        <button type="button" class="btn btn-start btn-award" onclick={onDismiss}>Dismiss</button>
        <button type="button" class="btn btn-small" onclick={() => onAward(pointsNum)}>Award {pointsNum} anyway</button>
      {/if}
      <button type="button" class="btn btn-small" onclick={onClose}>Later</button>
    </div>
  </div>
</div>
