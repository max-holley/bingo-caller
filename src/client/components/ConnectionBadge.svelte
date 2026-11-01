<script lang="ts">
  import type { SocketStatus } from '../lib/ws';
  let { status }: { status: SocketStatus } = $props();
  const text: Record<SocketStatus, string> = {
    connecting: 'Connecting…', open: 'Connected', reconnecting: 'Reconnecting…', closed: 'Disconnected',
  };
</script>

<p class="conn conn-{status}" role="status" aria-live="polite">
  <span class="dot" aria-hidden="true"></span>{text[status]}
</p>
