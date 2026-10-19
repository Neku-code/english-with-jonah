<script lang="ts">
  import '@fontsource/dm-sans/400.css';
  import '@fontsource/dm-sans/500.css';
  import '@fontsource/dm-sans/600.css';
  import '../app.css';
  import { page } from '$app/state';
  let { children } = $props();
</script>
<svelte:head><meta name="description" content="English with Jonah — Box 1 project setup verification." /></svelte:head>
<a class="skip-link" href="#main">Skip to content</a>
<div class="site-shell container">
  <header class="site-header"><a class="site-name" href="/">English with Jonah</a><nav aria-label="Setup navigation"><a href="/" aria-current={page.url.pathname === '/' ? 'page' : undefined}>Setup</a><a href="/foundation" aria-current={page.url.pathname === '/foundation' ? 'page' : undefined}>Component checks</a></nav></header>
  <main id="main" tabindex="-1">{@render children()}</main>
  <footer>Box 1 verification preview · Application design pending</footer>
</div>
