<script lang="ts">
 let {data}=$props();
 const current=$derived(data.rows.find(row=>row.isCurrent));
</script>
<svelte:head><title>Ranking · English with Jonah</title></svelte:head>
<section class="ranking-page">
 <a class="back-link" href="/home">← Darslar</a>
 <div class="section-heading"><div><p class="eyebrow">BIRGALIKDA O‘RGANAMIZ</p><h1>Ranking</h1></div></div>
 <p class="muted">Yig‘ilgan coin va o‘qituvchi qo‘shgan yoki ayirgan coin — reyting ballaringiz. Bir xil ball olganlar bir xil o‘rinda turadi.</p>
 {#if data.unavailable}<div class="home-notice feedback--error" role="alert"><h2>Reytingni yuklab bo‘lmadi.</h2><a class="button button--secondary" href="/ranking" data-sveltekit-reload>Qayta urinish</a></div>
 {:else}
  {#if current}<p class="coin-total"><strong>{current.points}</strong> coin · Sizning o‘rningiz: <strong>{current.rank}</strong></p>{/if}
  <ol class="ranking-list" aria-label="O‘quvchilar reytingi">{#each data.rows as row}
   <li class:ranking-current={row.isCurrent} aria-current={row.isCurrent?'true':undefined}><span class="ranking-place" aria-label={`${row.rank}-o‘rin`}>{row.rank}</span><span class="ranking-name">{row.name}{#if row.isCurrent}<small>Siz</small>{/if}</span><strong>{row.points}<small>coin</small></strong></li>
  {/each}</ol>
  {#if !data.rows.length}<p class="empty-state">Reytingda hali o‘quvchilar yo‘q.</p>{/if}
 {/if}
 <details class="reward-guide"><summary>Coin qanday olinadi?</summary><ul><li>Lug‘at testidan kamida 75%: <strong>30 coin</strong>.</li><li>Darsni tugallash: <strong>50 coin</strong>.</li><li>1.6 yakuniy testidan kamida 90%: har bir tugallangan darsga <strong>10 coin</strong> va o‘zlashtirilgan holati.</li></ul><p>Ko‘rib chiqdim — darsni ochadi. Coin har bir natija uchun faqat bir marta beriladi.</p></details>
</section>
