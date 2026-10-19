<script lang="ts">
  import '@fontsource/dm-sans/400.css';
  import '@fontsource/dm-sans/500.css';
  import '@fontsource/dm-sans/600.css';
  import '@fontsource/kalam/700.css';
  import '../app.css';
  import '../student.css';
  import '../teacher.css';
  import StudentNav from '#lib/components/StudentNav.svelte';
  import MoonStars from 'phosphor-svelte/lib/MoonStars';
  import { navigating, page } from '$app/state';
  let { children, data } = $props();
  const student = $derived(/^\/(home|learn|vocabulary|profile|ranking)(\/|$)/.test(page.url.pathname));
  const teacher = $derived(/^\/admin(\/|$)/.test(page.url.pathname));
  const name = $derived(data.viewer?.displayName ?? 'Jonah');
</script>
<svelte:head><meta name="description" content="English with Jonah — ingliz tilini birgalikda o‘rganamiz." /></svelte:head>
<a class="skip-link" href="#main">Asosiy qismga o‘tish</a>
<div class="app-frame" class:student-frame={student} class:teacher-frame={teacher} class:entry-frame={!student&&!teacher}>
 {#if student}
  <aside class="student-sidebar">
    <a class="jonah-brand" href="/home" aria-label="English with Jonah — Darslar">Learn<br /><span>with <b>Jonah</b></span></a>
    <StudentNav />
    <div class="sidebar-encouragement"><p>Kichik qadamlar.<br /><strong>Katta natijalar.</strong></p><img src="/images/jonah-student.webp" width="320" height="320" alt="" loading="lazy" /></div>
  </aside>
 {/if}
 <div class="site-shell container" class:learning-shell={page.url.pathname.startsWith('/learn/')}>
  <header class="site-header">
   <a class="jonah-brand" href={teacher?'/admin':student?'/home':'/'} aria-label="English with Jonah">Learn <span>with <b>Jonah</b></span></a>
   {#if student}<a class="header-profile" href="/profile"><span class="avatar" aria-hidden="true">{name.slice(0,1).toLocaleUpperCase('uz')}</span><span>{name}</span></a>
   {:else if teacher}<span class="header-note teacher-mode"><MoonStars size={20} aria-hidden="true" /> O‘qituvchi xonasi</span>
   {:else}<span class="header-note">Ingliz tilini birgalikda o‘rganamiz.</span>{/if}
  </header>
  <div class="navigation-status" role="status">{navigating.to ? 'Yuklanmoqda…' : ''}</div>
  <main id="main" tabindex="-1">{@render children()}</main>
  <footer>English with Jonah <span>Har kuni bir qadam oldinga.</span></footer>
 </div>
 {#if student}<div class="mobile-student-nav"><StudentNav /></div>{/if}
</div>
