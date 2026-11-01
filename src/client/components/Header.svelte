<script lang="ts">
  let { subtitle = 'Lucky Numbers Caller' }: { subtitle?: string } = $props();
</script>

<header class="header fade-in">
  <div class="logo-ring"></div>
  <h1 class="title">BINGO<span class="title-accent">!</span></h1>
  <p class="subtitle">{subtitle}</p>
</header>
