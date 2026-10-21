<script lang="ts">
 import Coin from '#lib/components/Coin.svelte';
 import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';
 import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
 import Trophy from 'phosphor-svelte/lib/Trophy';
 import Medal from 'phosphor-svelte/lib/Medal';
 import {nextRankGap} from '#lib/learning/ranking.ts';
 let {data}=$props();
 const current=$derived(data.rows.find(row=>row.isCurrent));
 const gap=$derived(nextRankGap(data.rows));
 const leaders=$derived(data.rows.slice(0,3));
</script>
<svelte:head><title>Reyting · English with Jonah</title></svelte:head>
<section class="ranking-page">
 <a class="back-link" href="/profile"><ArrowLeft size={17} aria-hidden="true" /> Profil</a>
 <header class="ranking-hero"><div><p class="eyebrow">BIR GURUH. KATTA MAQSADLAR.</p><h1>Harakat natijaga<br />aylanadi.</h1><p>Darsni tugating, yangi so‘zlarni o‘rganing va reytingda ko‘tariling.</p></div><span class="ranking-trophy" aria-hidden="true"><Trophy size={72} weight="duotone" /></span></header>
 {#if data.unavailable}<div class="home-notice feedback--error" role="alert"><h2>Reytingni yuklab bo‘lmadi.</h2><a class="button button--secondary" href="/ranking" data-sveltekit-reload>Qayta urinish</a></div>
 {:else}
  {#if leaders.length}<div class="ranking-podium" aria-label="Eng yuqori natijalar">{#each leaders as row,i}
   <article class="podium-card" class:podium-winner={row.rank===1} style={`--podium-order:${i===0?2:i===1?1:3}`}>
    <span class="podium-medal" aria-hidden="true">{#if row.rank===1}<Trophy size={26} weight="fill" />{:else}<Medal size={26} weight="duotone" />{/if}</span>
    <span class="podium-avatar" aria-hidden="true">{row.name.slice(0,1).toLocaleUpperCase('uz')}</span>
    <h2>{row.name}</h2>{#if row.isCurrent}<span class="you-label">Siz</span>{/if}
    <Coin amount={row.points} /><p class="podium-rank">{row.rank}<span>-o‘rin</span></p>
   </article>
  {/each}</div>{/if}
  {#if current}<section class="rank-challenge" aria-label="Sizning natijangiz"><div class="rank-current-number">#{current.rank}</div><div><p class="eyebrow">SIZNING NATIJANGIZ</p><h2>{#if gap}Yana {gap.coins} coin — {gap.rank}-o‘ringa.{:else}Siz birinchi o‘rindasiz!{/if}</h2><p>{gap?'Bitta dars: +50. Bitta lug‘at testi: +30.':'O‘rganishda davom eting. Har bir tugallangan dars — yangi yutuq.'}</p></div><a href="/home" class="button button--primary">Darslar <ArrowRight size={18} aria-hidden="true" /></a></section>{/if}
  <div class="student-section-heading"><h2>Guruh reytingi</h2><span class="muted">{data.rows.length} o‘quvchi · jami coin</span></div>
  <ol class="ranking-list" aria-label="O‘quvchilar reytingi">{#each data.rows as row}
   <li class:ranking-current={row.isCurrent} aria-current={row.isCurrent?'true':undefined}><span class="ranking-place" aria-label={`${row.rank}-o‘rin`}>{row.rank}</span><span class="ranking-name">{row.name}{#if row.isCurrent}<small>Siz</small>{/if}</span><Coin amount={row.points} /></li>
  {/each}</ol>
  {#if !data.rows.length}<p class="empty-state">Reytingda hali o‘quvchilar yo‘q.</p>{/if}
 {/if}
 <p class="ranking-fairness">Bir xil coin — bir xil o‘rin. Reyting jami yig‘ilgan coin va o‘qituvchi tuzatishlarini hisobga oladi.</p>
 <details class="reward-guide"><summary>Coin qanday olinadi?</summary><ul><li>Lug‘at testidan kamida 75%: <strong>30 coin</strong>.</li><li>Darsni tugallash: <strong>50 coin</strong>.</li><li>Bo‘limning yakuniy imtihonidan kamida 90%: har bir tugallangan darsga <strong>10 coin</strong>.</li></ul><p>Coin har bir natija uchun faqat bir marta beriladi. Qayta mashq qilish coinlarni kamaytirmaydi.</p></details>
</section>
