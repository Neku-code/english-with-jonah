<script lang="ts">
  import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
  import BookOpen from 'phosphor-svelte/lib/BookOpen';
  import CaretRight from 'phosphor-svelte/lib/CaretRight';
  import CheckCircle from 'phosphor-svelte/lib/CheckCircle';
  import LockSimple from 'phosphor-svelte/lib/LockSimple';
  import Trophy from 'phosphor-svelte/lib/Trophy';
  import Plant from 'phosphor-svelte/lib/Plant';
  import Coin from '#lib/components/Coin.svelte';
  let { data } = $props();
  const date = (value: string) => new Intl.DateTimeFormat('uz-Latn', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long' }).format(new Date(value));
  const focused = $derived(data.home?.units.find(u => !u.mastered) ?? data.home?.units[0]);
  const progress = $derived(focused?.total ? Math.round(100 * (focused.finished + (focused.mastered ? 1 : 0)) / (focused.total + 1)) : 0);
</script>
<svelte:head><title>Darslar · English with Jonah</title></svelte:head>
<section class="student-page dashboard">
  <section class="welcome-banner" aria-labelledby="welcome-title">
    <img src="/images/jonah-city.webp" alt="" width="1600" height="640" fetchpriority="high" />
    <div><p class="eyebrow">LEARN WITH JONAH</p><h1 id="welcome-title">Xush kelibsiz!</h1><p>Salom, {data.student.displayName}.<br />Ingliz tilini qadamma-qadam o‘rganamiz.</p>
    {#if data.home?.primary}<a class="button button--sage" href={data.home.primary.href}>{data.home.primary.label}<ArrowRight size={19} aria-hidden="true" /></a>{:else if data.home&&data.home.lessonCount>0}<a class="button button--sage" href="#units">Darslarni ko‘rish<ArrowRight size={19} aria-hidden="true" /></a>{/if}</div>
  </section>
  {#if data.unavailable || !data.home}
    <div class="home-notice feedback--error" role="alert"><h2>Darslarni yuklab bo‘lmadi.</h2><p>Ma’lumotlaringiz saqlangan. Birozdan so‘ng qayta urinib ko‘ring.</p><a href="/home" class="button button--secondary" data-sveltekit-reload>Qayta urinish</a></div>
  {:else if data.home.lessonCount === 0}
    <div class="empty-state"><BookOpen size={32} aria-hidden="true" /><div><h2>Darslar hali qo‘shilmagan.</h2><p>O‘qituvchi darslarni joylagach, ular shu yerda paydo bo‘ladi.</p></div></div>
  {:else}
    <div class="student-section-heading"><h2>Sizning natijangiz</h2><a href="/profile">Barchasi <ArrowRight size={16} aria-hidden="true" /></a></div>
    <div class="progress-overview">
      {#if focused}<div class="progress-card">
        <div class="progress-ring" role="img" aria-label={`${progress}% tugallangan`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="43" /><circle class="ring-fill" cx="50" cy="50" r="43" pathLength="100" stroke-dasharray={`${progress} 100`} /></svg><strong>{progress}%</strong></div>
        <div><p class="eyebrow">UNIT {focused.position}</p><h3>{focused.title.replace(/^Unit\s*\d+\s*[:·—–-]?\s*/i,'')}</h3><div class="progress-caption"><span>{focused.mastered?'O‘zlashtirilgan':'5 dars + imtihon'}</span><span>{focused.finished+(focused.mastered?1:0)} / {focused.total+1} tugallangan</span></div><progress value={progress} max="100" aria-label="Bo‘lim natijasi"></progress></div>
      </div>{/if}
      <a href="/profile" class="balance-card"><Coin amount={data.home.totalPoints} large /><span>Yig‘ilgan coin <ArrowRight size={17} aria-hidden="true" /></span></a>
    </div>
    <div class="student-section-heading" id="units"><h2>Bo‘limlar</h2><span class="muted">O‘z sur’atingizda o‘rganing</span></div>
    <div class="unit-card-grid">{#each data.home.units as unit}
      <article class="illustrated-unit" class:present-simple-unit={unit.position===2}><div><p class="unit-kicker">Unit {unit.position}</p><h3>{unit.title.replace(/^Unit\s*\d+\s*[:·—–-]?\s*/i,'')}</h3><p>{unit.position===2?'I study. She works. Do you…?':'I am, you are, he is…'}</p>{#if unit.lessons[0]}<a href={`#unit-${unit.id}`} class="button button--primary">{unit.finished?'Davom ettirish':'Boshlash'}<ArrowRight size={18} aria-hidden="true" /></a>{/if}<small><BookOpen size={17} aria-hidden="true" />{unit.total} dars + yakuniy imtihon</small></div><img src={unit.position===2?'/lessons/unit2/2026-10-21.1/routines-640.webp':'/images/jonah-student.webp'} alt="" width="320" height="320" loading="lazy" decoding="async" /></article>
    {/each}<aside class="learning-note"><Plant size={34} weight="duotone" aria-hidden="true" /><h3>Har bir qadam muhim.</h3><p>Bir oz o‘rganing, mashq qiling va natijangizni kuzating.</p><span>Bugun ham davom eting.</span></aside></div>
    {#each data.home.units as unit}
      <section class="student-lessons" aria-labelledby={`unit-${unit.id}`}><div class="student-section-heading"><h2 id={`unit-${unit.id}`}>Unit {unit.position} · Darslar</h2><span class="muted">{unit.finished}/{unit.total} tugallangan</span></div>
        {#if unit.examResult}<p class="exam-result">Yakuniy imtihon: {unit.examResult.pendingReview?'Tarixiy urinish tekshirilmoqda':`${Math.round(100*(unit.examResult.earnedPoints??0)/(unit.examResult.maxPoints||1))}%`}</p>{/if}
        <ul class="designed-lesson-list">{#each unit.lessons as lesson}
          <li><a class="designed-lesson" href={lesson.href}>
            <span class="lesson-tile" class:exam-tile={lesson.kind==='final_exam'}>{#if lesson.kind==='final_exam'}<Trophy size={28} weight="duotone" aria-hidden="true" />{:else}<BookOpen size={28} weight="duotone" aria-hidden="true" />{/if}<small>{unit.position}.{lesson.position}</small></span>
            <span class="designed-lesson-name"><strong>{lesson.title}</strong><small>{lesson.kind==='final_exam'?'Bo‘lim oxiridagi yagona imtihon':`${lesson.taskCount} ta mashq · To‘g‘ri bajaring va tugating`}</small></span>
            <span class="lesson-state" class:is-complete={lesson.completed||lesson.mastered}>{#if lesson.mastered}<CheckCircle size={16} aria-hidden="true" />O‘zlashtirilgan{:else if lesson.completed}<CheckCircle size={16} aria-hidden="true" />Tugallangan{:else if lesson.needsVocabulary||lesson.needsLessons}<LockSimple size={15} aria-hidden="true" />{lesson.needsLessons?'Darslardan keyin':'Avval lug‘at'}{:else}{lesson.inProgress?'Davom etmoqda':'Boshlash'}{/if}</span><CaretRight class="row-chevron" size={20} aria-hidden="true" />
          </a>{#if lesson.kind==='lesson'}<div class="lesson-row-footer"><a href={`${lesson.href}?vocab`}>{lesson.vocabularyMastered?'Lug‘atni takrorlash':'Lug‘atni o‘rganish'}<ArrowRight size={14} aria-hidden="true" /></a><Coin amount={lesson.coins} /></div>{/if}</li>
        {/each}</ul>
      </section>
    {/each}
    {#if data.home.recent.length}<section class="recent-section"><div class="student-section-heading"><h2>So‘nggi faoliyat</h2><a href="/profile">Profil <ArrowRight size={16} aria-hidden="true" /></a></div><ul class="recent-list">{#each data.home.recent as activity}<li><div><strong>{activity.title}</strong><span>{activity.status==='in_progress'?'Davom etmoqda':activity.pendingReview?'Tarixiy tekshiruv':'Urinish yakunlangan'}</span></div><time datetime={activity.updatedAt}>{date(activity.updatedAt)}</time></li>{/each}</ul></section>{/if}
  {/if}
</section>
