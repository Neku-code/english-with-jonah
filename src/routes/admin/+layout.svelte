<script lang="ts">
  import { page } from '$app/state';
  let { children } = $props();
  const links = [['/admin', 'Umumiy holat'], ['/admin/students', 'O‘quvchilar'], ['/admin/reviews', 'Yozma javoblar'], ['/admin/questions', 'Savollar tahlili']];
</script>
<section class="admin-workspace">
  <div class="admin-top"><p class="eyebrow">O‘QITUVCHI XONASI</p><form method="POST" action="/switch"><button class="button button--quiet" type="submit">Chiqish</button></form></div>
  <nav class="admin-nav" aria-label="O‘qituvchi bo‘limlari">
    {#each links as [href, label]}<a {href} aria-current={(href === '/admin' ? page.url.pathname === href : page.url.pathname.startsWith(href)) ? 'page' : undefined}>{label}</a>{/each}
  </nav>
  <div class="admin-content">{@render children()}</div>
</section>
