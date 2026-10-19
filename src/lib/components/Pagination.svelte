<script lang="ts">
  import { page as current } from '$app/state';
  let { page, total, size = 20 }: { page: number; total: number; size?: number } = $props();
  function link(n: number) { const url = new URL(current.url.href); url.searchParams.set('page', String(n)); return url.pathname + url.search; }
</script>
{#if total > size || page > 1}
  <nav class="pagination" aria-label="Sahifalar">
    {#if page > 1}<a class="button button--secondary" href={link(page - 1)}>← Oldingi</a>{/if}
    <span>{page}-sahifa · Jami {total} ta</span>
    {#if page * size < total}<a class="button button--secondary" href={link(page + 1)}>Keyingi →</a>{/if}
  </nav>
{/if}
