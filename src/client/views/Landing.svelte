<script lang="ts">
  let { onQuick }: { onQuick: () => void } = $props();
</script>

<div class="app">
  <header class="header fade-in">
    <div class="logo-ring"></div>
    <h1 class="title">BINGO<span class="title-accent">!</span></h1>
    <p class="subtitle">Lucky Numbers Caller</p>
  </header>

  <div class="panel landing-panel fade-in">
    <!-- Host game / Join game arrive in milestone 2. -->
    <button type="button" class="btn btn-start" onclick={onQuick}>Quick caller</button>
    <p class="landing-note">Single device, works offline.</p>
  </div>
</div>
