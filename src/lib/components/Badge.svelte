<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children, tone = 'neutral' }: { children: Snippet; tone?: 'neutral' | 'sage' | 'honey' | 'clay' } = $props();
</script>

<span class="badge badge--{tone}">{@render children()}</span>
