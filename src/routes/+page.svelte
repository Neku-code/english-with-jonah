<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  let busy = $state(false);
</script>
<svelte:head><title>Kirish · English with Jonah</title></svelte:head>
<section class="entry-wrap" aria-labelledby="entry-title">
  <div class="entry-intro"><p class="eyebrow">ENGLISH WITH JONAH</p><h1 id="entry-title">Xush kelibsiz.</h1><p>Ingliz tilini birgalikda o‘rganamiz.</p><img class="entry-art" src="/images/jonah-city.webp" width="1600" height="640" alt="" /></div>
  <div class="entry-panel">
    <h2>Profilingizga kiring</h2>
    <p class="muted">Ismingizni kiriting va o‘rganishni boshlang.</p>
    {#if data.unavailable}<p class="feedback feedback--error" role="alert">Profilni yuklab bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.</p>{/if}
    <form method="POST" aria-busy={busy} use:enhance={() => {
      busy = true;
      return async ({ update }) => { try { await update({ reset: false }); } finally { busy = false; } };
    }}>
      <div class="field"><label for="student-name">Ismingiz</label>
        <input id="student-name" name="name" type="text" autocomplete="name" maxlength="120" required value={form?.name ?? ''} disabled={busy}
          aria-invalid={form?.error ? 'true' : undefined} aria-describedby={form?.error ? 'entry-help entry-error' : 'entry-help'} />
        <p id="entry-help" class="field__help">Keyingi safar ham shu ism bilan kiring.</p>
      </div>
      {#if form?.error}<p id="entry-error" class="feedback feedback--error" role="alert">{form.error}</p>{/if}
      <button class="button button--primary entry-submit" type="submit" disabled={busy}>{busy ? 'Kirilmoqda…' : 'Kirish'}<span aria-hidden="true">→</span></button>
      <p class="visually-hidden" role="status">{busy ? 'Profil ochilmoqda. Iltimos, kuting.' : ''}</p>
    </form>
    <p class="entry-help">Yangi ism bilan yangi profil ochiladi. Bu ism bilan profil bo‘lsa, o‘sha profilga kirasiz.</p>
  </div>
</section>
