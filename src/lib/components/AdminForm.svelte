<script lang="ts">
  import { enhance } from '$app/forms';
  import type { Snippet } from 'svelte';
  let { action, children }: { action: string; children: Snippet<[boolean]> } = $props();
  let busy = $state(false);
</script>
<form method="POST" {action} aria-busy={busy} use:enhance={({ cancel }) => {
  if (busy) { cancel(); return; }
  busy = true;
  return async ({ update }) => { try { await update({ reset: false }); } finally { busy = false; } };
}}>
  <fieldset class="admin-fields" disabled={busy}>{@render children(busy)}</fieldset>
  <span class="visually-hidden" role="status">{busy ? 'Saqlanmoqda…' : ''}</span>
</form>
