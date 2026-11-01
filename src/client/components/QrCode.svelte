<script lang="ts">
  // QR code generated locally (no external service). Rendered as an SVG path.
  import qrcode from 'qrcode-generator';

  let { text, label }: { text: string; label: string } = $props();

  const qr = $derived.by(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { size: n + 8, d };
  });
</script>

<svg class="qr" viewBox="0 0 {qr.size} {qr.size}" role="img" aria-label={label} shape-rendering="crispEdges">
  <rect width={qr.size} height={qr.size} fill="#fff" />
  <path d={qr.d} fill="#000" />
</svg>

<style>
  .qr { width: 100%; max-width: 220px; height: auto; border-radius: 10px; display: block; }
</style>
