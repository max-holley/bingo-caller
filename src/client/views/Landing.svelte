<script lang="ts">
  import Header from '../components/Header.svelte';

  let { onHost, onJoin, onQuick, notice = null }: {
    onHost: () => void; onJoin: () => void; onQuick: () => void; notice?: string | null;
  } = $props();
</script>

<div class="app">
  <Header />

  <div class="panel landing-panel fade-in">
    {#if notice}
      <p class="notice" role="status">{notice}</p>
    {/if}
    <button type="button" class="btn btn-start" onclick={onHost}>Host a game</button>
    <button type="button" class="btn btn-secondary" onclick={onJoin}>Join a game</button>
    <button type="button" class="link-btn" onclick={onQuick}>Quick caller (offline)</button>
  </div>
</div>
