<script lang="ts">
  let { amount, large = false }: { amount?: number | string; large?: boolean } = $props();
</script>
<span class="jonah-coins" class:jonah-coins--large={large}>
  <img src="/images/jonah-coin.webp" alt="" width="40" height="40" />
  {#if amount !== undefined}<span><strong>{amount}</strong><span class="coin-label"> coin</span></span>{/if}
</span>
