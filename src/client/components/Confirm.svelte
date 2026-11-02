<script lang="ts">
  // An inline "are you sure?" panel. It slides and fades open below the button that asked,
  // instead of replacing it, so nothing on the page jumps. Focus moves to Cancel when it opens
  // and Escape closes it.
  import { slide, fade } from 'svelte/transition';
  import { reveal, ms } from '../lib/motion';

  let {
    open = $bindable(false),
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    onConfirm,
    compact = false,
  }: {
    open?: boolean;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    compact?: boolean;
  } = $props();

  function focusOnMount(el: HTMLElement) {
    el.focus({ preventScroll: true });
  }
</script>

{#if open}
  <div class="confirm-panel" class:compact transition:slide={reveal()}>
    <div
      class="confirm-inner"
      role="alertdialog"
      aria-label={message}
      tabindex="-1"
      onkeydown={e => { if (e.key === 'Escape') { e.stopPropagation(); open = false; } }}
      in:fade={{ duration: ms(200), delay: ms(60) }}
    >
      <span class="confirm-msg">{message}</span>
      <span class="confirm-btns">
        <button type="button" class="btn btn-danger btn-small" onclick={() => { open = false; onConfirm(); }}>{confirmLabel}</button>
        <button type="button" class="btn btn-small" use:focusOnMount onclick={() => (open = false)}>{cancelLabel}</button>
      </span>
    </div>
  </div>
{/if}
