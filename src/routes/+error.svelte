<script lang="ts">
  import { page } from '$app/state';
  import Button from '#lib/components/Button.svelte';
</script>

<svelte:head><title>{page.status} — English with Jonah</title></svelte:head>
<section class="error-page"><p class="eyebrow">{page.status}</p><h1>{page.status === 404 ? 'Sahifa topilmadi.' : 'Sahifani ochib bo‘lmadi.'}</h1><p>{page.status === 404 ? 'Manzilni tekshiring yoki bosh sahifaga qayting.' : 'Xizmat vaqtincha ishlamayapti. Birozdan so‘ng qayta urinib ko‘ring.'}</p><div class="actions"><Button href="/">Bosh sahifaga</Button><a href={page.url.pathname + page.url.search} data-sveltekit-reload>Qayta urinish</a></div></section>
