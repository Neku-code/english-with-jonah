<script lang="ts">
  import { page } from '$app/state';
  import Button from '#lib/components/Button.svelte';
</script>

<svelte:head><title>{page.status} — English with Jonah</title></svelte:head>
<section class="error-page container"><p class="eyebrow">{page.status}</p><h1>Let’s find your way back.</h1><p>{page.status === 404 ? 'This page could not be found.' : 'Something went wrong. Please try again.'}</p><Button href="/">Back to learning</Button></section>
