<script lang="ts">
  // Host game screen: the caller (roller, CALL NUMBER, board) plus a side panel with the
  // claim queue, stage and points controls, lock, roster (kick) and End game.
  import Caller from '../components/Caller.svelte';
  import Roster from '../components/Roster.svelte';
  import ClaimModal from '../components/ClaimModal.svelte';
  import ConnectionBadge from '../components/ConnectionBadge.svelte';
  import { STAGE_NAMES } from '../../shared/ticket';
  import { MAX_NUMBER, STAGES, type Stage } from '../../shared/protocol';
  import type { HostController } from '../lib/host.svelte';

  let { host }: { host: HostController } = $props();
  let confirmEnd = $state(false);
  let confirmNext = $state(false);
  let openClaimId = $state<string | null>(null);

  const online = $derived(host.players.filter(p => p.online).length);
  const claimants = $derived(new Set(host.claims.map(c => c.playerId)));
  const openClaim = $derived(host.claims.find(c => c.claimId === openClaimId) ?? null);
  const nextStage = $derived(host.stage < 3 ? ((host.stage + 1) as Stage) : null);

  function openFor(playerId: string) {
    openClaimId = host.claims.find(c => c.playerId === playerId)?.claimId ?? null;
  }

  function setPoints(stage: Stage, v: string) {
    const n = Math.floor(Number(v));
    if (Number.isFinite(n) && n >= 0 && n <= 1000) host.setPoints(stage, n);
  }
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

    {#if host.claims.length}
      <section class="claims" aria-labelledby="claims-h">
        <h2 class="board-title" id="claims-h">BINGO claims <span class="count">{host.claims.length} waiting</span></h2>
        <ul class="claim-queue">
          {#each host.claims as c (c.claimId)}
            <li>
              <button type="button" class="claim-chip" onclick={() => (openClaimId = c.claimId)}>
                🔔 <span class="claim-name">{c.name}</span> · {STAGE_NAMES[c.stage]}
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <div class="stage-controls">
      {#if nextStage}
        {#if !confirmNext}
          <button type="button" class="btn btn-secondary btn-small" onclick={() => (host.claims.length ? (confirmNext = true) : host.nextStage())}>
            Next stage: {STAGE_NAMES[nextStage]} →
          </button>
        {:else}
          <div class="confirm" role="alertdialog" aria-label="Confirm next stage">
            <span>{host.claims.length} claim{host.claims.length === 1 ? '' : 's'} still waiting will be dismissed.</span>
            <button type="button" class="btn btn-danger btn-small" onclick={() => { host.nextStage(); confirmNext = false; }}>Move on</button>
            <button type="button" class="btn btn-small" onclick={() => (confirmNext = false)}>Cancel</button>
          </div>
        {/if}
      {:else}
        <p class="hint">Full House is the last stage. Press End game when you're done.</p>
      {/if}
      <label class="lock-toggle">
        <input type="checkbox" checked={host.locked} onchange={e => host.setLocked(e.currentTarget.checked)} />
        Lock joining {host.locked ? '(locked)' : ''}
      </label>
    </div>

    <details class="points-table">
      <summary>Points per stage: {STAGES.map(s => host.points[s]).join(' / ')}</summary>
      <div class="points-grid">
        {#each STAGES as s (s)}
          <label class="points-field">
            {STAGE_NAMES[s]}
            <input class="text-input points-input" type="number" min="0" max="1000" inputmode="numeric"
              value={host.points[s]} onchange={e => setPoints(s, e.currentTarget.value)} />
          </label>
        {/each}
      </div>
    </details>

    <h2 class="board-title">Players <span class="count">{online} online · {host.players.length} joined</span></h2>
    <Roster players={host.players} onKick={id => host.kick(id)} {claimants} onOpenClaim={openFor} showPoints />

    <div class="lobby-actions">
      {#if !confirmEnd}
        <button type="button" class="btn btn-reset" class:btn-end-final={!nextStage} onclick={() => (confirmEnd = true)}>End game</button>
      {:else}
        <div class="confirm" role="alertdialog" aria-label="Confirm end game">
          <span>End the game, show the final scores and delete it?</span>
          <button type="button" class="btn btn-danger btn-small" onclick={() => host.endGame()}>Yes, end it</button>
          <button type="button" class="btn btn-small" onclick={() => (confirmEnd = false)}>Cancel</button>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if openClaim}
  <ClaimModal
    claim={openClaim}
    called={host.called}
    defaultPoints={host.points[openClaim.stage]}
    onAward={p => { host.award(openClaim.claimId, p); openClaimId = null; }}
    onDismiss={() => { host.dismiss(openClaim.claimId); openClaimId = null; }}
    onClose={() => (openClaimId = null)}
  />
{/if}
