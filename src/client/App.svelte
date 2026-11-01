<script lang="ts">
  import { onMount } from 'svelte';
  import { buildStars, buildSpookLayer, buildXmasLayer } from './lib/effects';
  import ThemePicker from './components/ThemePicker.svelte';
  import Landing from './views/Landing.svelte';
  import QuickCaller from './views/QuickCaller.svelte';

  type View = 'landing' | 'quick';
  let view = $state<View>('landing');

  let starfield = $state<HTMLElement>()!;
  let spookLayer = $state<HTMLElement>()!;
  let xmasLayer = $state<HTMLElement>()!;

  onMount(() => {
    buildStars(starfield);
    buildSpookLayer(spookLayer);
    buildXmasLayer(xmasLayer);
  });
</script>

<div class="starfield" bind:this={starfield}></div>
<div class="spook-layer" bind:this={spookLayer} aria-hidden="true"></div>
<div class="xmas-layer" bind:this={xmasLayer} aria-hidden="true"></div>

{#if view === 'landing'}
  <Landing onQuick={() => (view = 'quick')} />
{:else}
  <QuickCaller onExit={() => (view = 'landing')} />
{/if}

<ThemePicker />
