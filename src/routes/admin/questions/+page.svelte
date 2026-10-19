<script lang="ts">
  import Button from '#lib/components/Button.svelte';
  import Pagination from '#lib/components/Pagination.svelte';
  let { data } = $props();
</script>
<svelte:head><title>Savollar tahlili · English with Jonah</title></svelte:head>
<div class="admin-heading"><h1>Savollar tahlili</h1><p class="muted">Qaysi savollarda ko‘proq xato qilinayotganini ko‘ring.</p></div>
<p class="notice">Har bir o‘quvchining har bir dars versiyasi bo‘yicha birinchi topshirilgan urinishi hisoblanadi. Xato foizi = xato / (to‘g‘ri + xato). Javobsiz va baholash kutilayotgan javoblar foizga kirmaydi. To‘liq ball — to‘g‘ri, qisman ball — xato. Versiyalar alohida hisoblanadi.</p>
<form class="admin-filters" method="GET">
  <div class="field"><label for="performance-lesson">Dars</label><select id="performance-lesson" name="lesson" value={data.lesson ?? ''}><option value="">Barcha darslar</option>{#each data.lessonOptions as lesson}<option value={lesson.id}>{lesson.title}</option>{/each}</select></div>
  <div class="field"><label for="performance-sort">Saralash</label><select id="performance-sort" name="sort" value={data.sort}><option value="percent">Xato foizi bo‘yicha</option><option value="count">Xatolar soni bo‘yicha</option></select></div>
  <Button type="submit" variant="secondary">Ko‘rsatish</Button>
</form>
{#if data.rows.length}<table class="admin-table performance-table"><thead><tr><th>Savol</th><th>Baholangan o‘quvchilar</th><th>To‘g‘ri</th><th>Xato</th><th>Xato foizi</th><th>Javobsiz</th><th>Kutilmoqda</th></tr></thead><tbody>
  {#each data.rows as row}<tr><td data-label="Savol"><strong>{row.prompt ?? 'Asl savol matni mavjud emas'}</strong><small>{row.unit} · {row.title} · v{row.version}</small><small class="mono">{row.questionId}</small></td><td data-label="Baholangan o‘quvchilar">{row.graded}</td><td data-label="To‘g‘ri">{row.correct}</td><td data-label="Xato">{row.incorrect}</td><td data-label="Xato foizi"><strong>{row.percent === null ? '—' : `${Number(row.percent).toFixed(1)}%`}</strong><small>{row.graded < 5 ? 'Namuna kichik' : `${row.graded} o‘quvchi asosida`}</small></td><td data-label="Javobsiz">{row.unanswered}</td><td data-label="Kutilmoqda">{row.pending}</td></tr>{/each}
</tbody></table>{:else}<div class="admin-empty"><h2>Hali savollar bo‘yicha natija yo‘q</h2><p>O‘quvchilar dars urinishlarini topshirganidan keyin haqiqiy natijalar paydo bo‘ladi.</p></div>{/if}
<Pagination page={data.page} total={data.total} />
