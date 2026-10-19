<script lang="ts">
  import '@fontsource/dm-sans/400.css';
  import '@fontsource/dm-sans/500.css';
  import '@fontsource/dm-sans/600.css';
  import '../app.css';
  import { navigating, page } from '$app/state';
  let { children } = $props();
</script>
<svelte:head><meta name="description" content="English with Jonah — ingliz tilini birgalikda o‘rganamiz." /></svelte:head>
<a class="skip-link" href="#main">Asosiy qismga o‘tish</a>
<div class="site-shell container" class:learning-shell={page.url.pathname.startsWith('/learn/')}>
  <header class="site-header"><a class="site-name" href="/">English with Jonah<span class="brand-dot" aria-hidden="true"></span></a><span class="header-note">Ingliz tili · Boshlang‘ich bosqich</span></header>
  <div class="navigation-status" role="status">{navigating.to ? 'Yuklanmoqda…' : ''}</div>
  <main id="main" tabindex="-1">{@render children()}</main>
  <footer>English with Jonah <span>Birgalikda o‘rganamiz.</span></footer>
</div>
