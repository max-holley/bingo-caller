<script lang="ts">
  // On every screen: the privacy notice and "Clear data on this device".
  import Confirm from './Confirm.svelte';
  let { onPrivacy, onClear, inGame = false }: { onPrivacy: (section?: string) => void; onClear: () => void; inGame?: boolean } = $props();
  let confirming = $state(false);
</script>

<footer class="site-footer">
  <div class="footer-links">
    <a href="/privacy" onclick={e => { e.preventDefault(); onPrivacy(); }}>Privacy notice</a>
    <span aria-hidden="true">·</span>
    <button type="button" class="link-btn" aria-expanded={confirming} onclick={() => (confirming = !confirming)}>Clear data on this device</button>
  </div>
  <p class="footer-note">Vibe coded with AI · <a href="/privacy#about" onclick={e => { e.preventDefault(); onPrivacy('about'); }}>about</a></p>
  <Confirm bind:open={confirming}
    message={`Delete everything this app saved on this device${inGame ? ' and leave the current game' : ''}?`}
    confirmLabel="Clear" onConfirm={onClear} />
</footer>
