<script lang="ts">
  // Optional sponsor slot shown once to the host before the lobby (disabled in v1 via
  // config.preGameInterstitial). Rules when it's enabled later: host only, never players; give up
  // after 2 seconds if the content hasn't loaded; wrap any third-party network in ConsentGate.
  import { onMount } from 'svelte';
  import { config } from '../config';

  let { onDone }: { onDone: () => void } = $props();
  const TIMEOUT_MS = 2000;

  onMount(() => {
    if (!config.preGameInterstitial.enabled) { onDone(); return; }
    const t = setTimeout(onDone, TIMEOUT_MS);
    return () => clearTimeout(t);
  });
</script>
