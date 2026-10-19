<script lang="ts">
  import { page } from '$app/state';
  import BookOpen from 'phosphor-svelte/lib/BookOpen';
  import Translate from 'phosphor-svelte/lib/Translate';
  import UserCircle from 'phosphor-svelte/lib/UserCircle';
  const links = [
    { href: '/home', label: 'Darslar', icon: BookOpen },
    { href: '/vocabulary', label: 'Lug‘at', icon: Translate },
    { href: '/profile', label: 'Profil', icon: UserCircle }
  ];
  function active(href: string) {
    const path = page.url.pathname;
    if (href === '/home') return path === '/home' || path.startsWith('/learn/') && !page.url.searchParams.has('vocab');
    if (href === '/vocabulary') return path === href || path.startsWith('/learn/') && page.url.searchParams.has('vocab');
    return path === '/profile' || path === '/ranking';
  }
</script>
<nav class="student-nav" aria-label="Asosiy bo‘limlar" data-sveltekit-preload-code="hover">
  {#each links as link}
    <a href={link.href} aria-current={active(link.href) ? 'page' : undefined}>
      <link.icon size={25} weight={active(link.href) ? 'fill' : 'regular'} aria-hidden="true" />
      <span>{link.label}</span>
    </a>
  {/each}
</nav>
