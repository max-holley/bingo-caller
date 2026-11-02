<script lang="ts">
  // On every screen: the privacy notice and "Clear data on this device".
  let { onPrivacy, onClear, inGame = false }: { onPrivacy: () => void; onClear: () => void; inGame?: boolean } = $props();
  let confirming = $state(false);
</script>

<footer class="site-footer">
  <a href="/privacy" onclick={e => { e.preventDefault(); onPrivacy(); }}>Privacy notice</a>
  <span aria-hidden="true">·</span>
  {#if !confirming}
    <button type="button" class="link-btn" onclick={() => (confirming = true)}>Clear data on this device</button>
  {:else}
    <span class="confirm" role="alertdialog" aria-label="Clear data on this device?">
      <span>Delete everything this app saved on this device{inGame ? ' and leave the current game' : ''}?</span>
      <button type="button" class="btn btn-danger btn-small" onclick={() => { confirming = false; onClear(); }}>Clear</button>
      <button type="button" class="btn btn-small" onclick={() => (confirming = false)}>Cancel</button>
    </span>
  {/if}
</footer>
