<script lang="ts">
  let { value, label = 'Unit progress' }: { value: number; label?: string } = $props();
  const percent = $derived(Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);
</script>

<div class="progress" role="progressbar" aria-label={label} aria-valuemin="0"
  aria-valuemax="100" aria-valuenow={percent}>
  <span style:width="{percent}%"></span>
</div>
