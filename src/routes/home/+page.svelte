<script lang="ts">
  let { data } = $props();
  const date = (value: string) => new Intl.DateTimeFormat('uz-Latn', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
</script>
<svelte:head><title>Bosh sahifa · English with Jonah</title></svelte:head>
<section class="home-page">
  <div class="home-heading"><div><p class="eyebrow">SIZNING O‘QUV SAHIFANGIZ</p><h1>Salom, {data.student.displayName}.</h1>{#if data.student.groupLabel}<p class="muted group-label">{data.student.groupLabel}</p>{/if}</div>
    <div class="home-account-actions"><a class="button button--secondary" href="/ranking">Ranking</a><form method="POST" action="/switch"><button type="submit" class="button button--secondary">Profilni almashtirish</button></form></div>
  </div>
  {#if data.unavailable || !data.home}
    <div class="home-notice feedback--error" role="alert"><h2>Darslarni yuklab bo‘lmadi.</h2><p>Ma’lumotlaringiz saqlangan. Birozdan so‘ng qayta urinib ko‘ring.</p><a href="/home" class="button button--secondary" data-sveltekit-reload>Qayta urinish</a></div>
  {:else if data.home.lessonCount === 0}
    <div class="empty-state"><span class="empty-mark" aria-hidden="true">↗</span><div><p class="eyebrow">DARS MATERIALLARI</p><h2>Darslar hali qo‘shilmagan.</h2><p>O‘qituvchi darslarni joylagach, ular shu yerda paydo bo‘ladi.</p></div></div>
  {:else}
    <p class="coin-total"><strong>{data.home.totalPoints}</strong> coin · <a href="/ranking">Reytingdagi o‘rningiz →</a></p>
    {#if data.home.primary}
      <section class="next-action" aria-labelledby="next-title"><div><p class="eyebrow">KEYINGI QADAM</p><h2 id="next-title">{data.home.primary.title}</h2></div><a class="button button--primary" href={data.home.primary.href}>{data.home.primary.label}<span aria-hidden="true">→</span></a></section>
    {/if}
    <div class="section-heading"><h2>Darslaringiz</h2><p class="muted">Darslarni o‘zingizga qulay tartibda tanlang.</p></div>
    <div class="unit-list">{#each data.home.units as unit}
      <section class="unit-panel" aria-labelledby={`unit-${unit.id}`}><div class="unit-heading"><h3 id={`unit-${unit.id}`}>{unit.title}</h3>{#if unit.total > 0}<span class="badge badge--sage">{unit.finished}/{unit.total} dars tugallangan</span>{/if}</div>
        {#if unit.total > 0}<div class="unit-progress"><progress max={unit.maximumPoints || 1} value={unit.points} aria-label={`${unit.title}: ${unit.points.toFixed(1)} coin`}></progress><span>{new Intl.NumberFormat('uz-Latn', { maximumFractionDigits: 1 }).format(unit.points)}/{unit.maximumPoints} coin · {unit.mastered ? 'To‘liq o‘zlashtirilgan' : 'Hali to‘liq o‘zlashtirilmagan'}</span></div>{/if}
        {#if unit.examResult}<p class="exam-result">Yakuniy imtihon: {unit.examResult.pendingReview ? 'o‘qituvchi tekshiruvini kutmoqda' : `${new Intl.NumberFormat('uz-Latn', { maximumFractionDigits: 1 }).format(100 * (unit.examResult.earnedPoints ?? 0) / (unit.examResult.maxPoints ?? 1))}%`}</p>{/if}
        {#if unit.lessons.length}<ul class="lesson-list">{#each unit.lessons as lesson}
          <li><a href={lesson.href}><span class="lesson-number" aria-hidden="true">{lesson.position.toString().padStart(2, '0')}</span><span class="lesson-name">{lesson.title}<small>{lesson.mastered ? '★ O‘zlashtirilgan' : lesson.completed ? '✓ Tugallangan' : lesson.inProgress ? 'Davom etmoqda' : lesson.needsLessons ? 'Avval bo‘lim darslarini tugating' : lesson.needsVocabulary ? '🔒 Avval lug‘atni ko‘rib chiqing' : 'Boshlanmagan'}</small><small>{lesson.kind === 'lesson' ? `${lesson.coins} coin · ${lesson.vocabularyMastered ? 'Lug‘at o‘zlashtirilgan' : 'Lug‘at testi: +30 coin'}` : '+10 coin / dars · 90% natija'}</small></span><span class="lesson-arrow" aria-hidden="true">{lesson.completed ? '✓' : '→'}</span></a>{#if lesson.kind === 'lesson'}<a class="lesson-vocabulary-link" href={`${lesson.href}?vocab`}>{lesson.vocabularyMastered ? '★ Lug‘atni takrorlash' : 'Lug‘at testi · +30 coin'} →</a>{/if}</li>
        {/each}</ul>{:else}<p class="muted">Bu bo‘limga darslar hali qo‘shilmagan.</p>{/if}
      </section>
    {/each}</div>
    {#if data.home.recent.length}<section class="recent-section"><h2>So‘nggi faoliyat</h2><ul class="recent-list">{#each data.home.recent as activity}<li><div><strong>{activity.title}</strong><span>{activity.status === 'in_progress' ? 'Davom etmoqda' : activity.pendingReview ? 'Tekshiruv kutilmoqda' : 'Urinish yakunlangan'}</span></div><time datetime={activity.updatedAt}>{date(activity.updatedAt)}</time></li>{/each}</ul></section>{/if}
  {/if}
</section>
