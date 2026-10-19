<script lang="ts">
  import Trophy from 'phosphor-svelte/lib/Trophy';
  import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
  import BookOpen from 'phosphor-svelte/lib/BookOpen';
  import Translate from 'phosphor-svelte/lib/Translate';
  import SignOut from 'phosphor-svelte/lib/SignOut';
  import Coin from '#lib/components/Coin.svelte';
  let { data } = $props();
  const finished = $derived(data.home?.units.reduce((n,u)=>n+u.finished,0) ?? 0);
  const vocabulary = $derived(data.home?.units.flatMap(u=>u.lessons).filter(l=>l.kind==='lesson'&&l.vocabularyMastered).length ?? 0);
</script>
<svelte:head><title>Profil · English with Jonah</title></svelte:head>
<section class="student-page profile-page">
  <div class="page-introduction"><p class="eyebrow">SIZNING SAHIFANGIZ</p><h1>Profil</h1><p>Har bir qadamingiz — yangi natija.</p></div>
  <section class="profile-identity"><span class="avatar avatar--large" aria-hidden="true">{data.student.displayName.slice(0,1).toLocaleUpperCase('uz')}</span><div><h2>{data.student.displayName}</h2><p>{data.student.groupLabel??'English with Jonah o‘quvchisi'}</p></div></section>
  {#if data.home}
    <div class="profile-stats"><div class="profile-balance"><Coin amount={data.home.totalPoints} large /><p>Jami yig‘ilgan coin</p></div><div><BookOpen size={26} aria-hidden="true" /><strong>{finished}</strong><p>Tugallangan dars</p></div><div><Translate size={26} aria-hidden="true" /><strong>{vocabulary}</strong><p>O‘zlashtirilgan lug‘at</p></div></div>
  {:else}<p class="feedback feedback--error" role="alert">Natijalarni yuklab bo‘lmadi. <a href="/profile" data-sveltekit-reload>Qayta urinish</a></p>{/if}
  <a class="profile-ranking-card" href="/ranking"><span class="trophy-mark"><Trophy size={34} weight="duotone" aria-hidden="true" /></span><div><p class="eyebrow">BIRGALIKDA O‘SAYLIK</p><h2>Reyting</h2><p>{data.standing?`Sizning o‘rningiz: ${data.standing.rank} · ${data.standing.points} coin`:'Guruh natijalarini ko‘ring.'}</p></div><ArrowRight size={24} aria-hidden="true" /></a>
  <section class="reward-guide"><h2>J coin to‘plang</h2><div class="reward-milestones"><div><Coin amount="+30" /><p>Lug‘at testi · 75% yoki yuqori</p></div><div><Coin amount="+50" /><p>Darsning barcha mashqlari to‘g‘ri</p></div><div><Coin amount="+10" /><p>Yakuniy imtihon · 90% dan, har darsga</p></div></div><p class="muted">Har bir mukofot bir marta beriladi. O‘qituvchi qo‘shgan yoki ayirgan coin ham jami balans va reytingga kiradi.</p></section>
  <form class="profile-switch" method="POST" action="/switch"><button class="button button--secondary" type="submit"><SignOut size={20} aria-hidden="true" />Profilni almashtirish</button></form>
</section>
