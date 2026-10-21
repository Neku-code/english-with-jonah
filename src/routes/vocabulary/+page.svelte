<script lang="ts">
  import Translate from 'phosphor-svelte/lib/Translate';
  import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
  import CheckCircle from 'phosphor-svelte/lib/CheckCircle';
  import Coin from '#lib/components/Coin.svelte';
  let { data } = $props();
  let search=$state('');
  const normalize=(s:string)=>s.toLocaleLowerCase('uz').replace(/[‘’ʻʼ`']/g,'').trim();
  const found=$derived(data.words.filter(w=>normalize(w.english+' '+w.uzbek).includes(normalize(search))));
</script>
<svelte:head><title>Lug‘at · English with Jonah</title></svelte:head>
<section class="student-page vocabulary-page">
  <div class="page-introduction"><p class="eyebrow">SO‘ZLARDAN BOSHLAYMIZ</p><h1>Kichik so‘zlar.<br />Katta imkoniyatlar.</h1><p>Avval tanishing, keyin mashq qiling. Har bir darsning o‘z lug‘ati bor.</p></div>
  {#if !data.unavailable}<label class="vocab-search"><Translate size={22} aria-hidden="true" /><span class="visually-hidden">Inglizcha yoki o‘zbekcha so‘z qidiring</span><input type="search" bind:value={search} placeholder="So‘z yoki tarjimani qidiring…" />{#if search}<button type="button" onclick={()=>search=''}>Tozalash</button>{/if}</label>{/if}
  {#if search.trim()}<p class="muted" role="status">{found.length} ta natija</p><div class="dictionary-results">{#each found as word}<a class="dictionary-word" href={word.href}><div><strong lang="en">{word.english}</strong><p>{word.uzbek}</p></div><span>Vocab {word.lesson}</span><ArrowRight size={18} aria-hidden="true" /></a>{/each}</div>{/if}
  <div class="vocabulary-explainer"><Translate size={32} weight="duotone" aria-hidden="true" /><p><strong>Ko‘rib chiqdim</strong> — darsni ochadi.<br /><strong>Test topshirish</strong> — 75% natijadan lug‘atni o‘zlashtiradi.</p><Coin amount="+30" /></div>
  {#if data.unavailable||!data.home}<p class="feedback feedback--error" role="alert">Lug‘atlarni yuklab bo‘lmadi. <a href="/vocabulary" data-sveltekit-reload>Qayta urinish</a></p>
  {:else if !data.home.lessonCount}<div class="empty-state"><p>Darslar qo‘shilgach, lug‘atlar shu yerda paydo bo‘ladi.</p></div>
  {:else}{#each data.home.units as unit}<div class="student-section-heading"><h2>Unit {unit.position} · Lug‘atlar</h2></div><div class="vocab-card-grid">{#each unit.lessons.filter(l=>l.kind==='lesson') as lesson}
    <a class="vocab-set-card" href={`${lesson.href}?vocab`}><span class="vocab-card-icon"><Translate size={30} weight="duotone" aria-hidden="true" /></span><span class="vocab-set-number">VOCAB {unit.position}.{lesson.position}</span><h3>{lesson.title}</h3><span class="vocab-set-status">{#if lesson.vocabularyMastered}<CheckCircle size={17} aria-hidden="true" /> O‘zlashtirilgan{:else if !lesson.needsVocabulary}Ko‘rib chiqilgan{:else}Yangi so‘zlar bilan tanishing{/if}</span><span class="vocab-card-action">{lesson.vocabularyMastered?'Takrorlash':'Lug‘atni ochish'}<ArrowRight size={20} aria-hidden="true" /></span></a>
  {/each}</div>{/each}{/if}
</section>
