<script lang="ts">
  // ConsentGate: no-op in v1, because the app uses no non-essential technology.
  //
  // Anything non-essential (analytics, ad scripts, third-party embeds such as a Buy Me a Coffee
  // widget) MUST be wrapped in this component. Before that happens, this needs a real
  // implementation: render children only after the user opts in, record the choice under a
  // `bingo.` key, and make rejecting and withdrawing as easy as accepting. Until then it renders
  // nothing, so wrapped content can never load by accident.
  import type { Snippet } from 'svelte';
  let { children }: { purpose: string; children: Snippet } = $props();
  const consented = false;
</script>

{#if consented}{@render children()}{/if}
