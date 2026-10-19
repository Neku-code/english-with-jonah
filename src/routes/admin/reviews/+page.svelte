<script lang="ts">
  import Button from '#lib/components/Button.svelte';
  import Pagination from '#lib/components/Pagination.svelte';
  import { date } from '#lib/admin-format.ts';
  let { data } = $props();
</script>
<svelte:head><title>Yozma javoblar · English with Jonah</title></svelte:head>
<div class="admin-heading"><h1>Yozma javoblar</h1><p class="muted">Baholash uchun javobni oching. Oldingi bahoni ham yangilashingiz mumkin.</p></div>
<form class="admin-filters" method="GET">
  <div class="field"><label for="review-student">O‘quvchi</label><select name="student" id="review-student" value={data.student ?? ''}><option value="">Barcha o‘quvchilar</option>{#each data.studentOptions as student}<option value={student.id}>{student.name}</option>{/each}</select></div>
  <div class="field"><label for="review-lesson">Dars</label><select name="lesson" id="review-lesson" value={data.lesson ?? ''}><option value="">Barcha darslar</option>{#each data.lessonOptions as lesson}<option value={lesson.id}>{lesson.title}</option>{/each}</select></div>
  <div class="field"><label for="review-state">Baholash holati</label><select name="state" id="review-state" value={data.reviewed ? 'reviewed' : 'pending'}><option value="pending">Baholash kutilmoqda</option><option value="reviewed">Avval tekshirilgan</option></select></div>
  <Button type="submit" variant="secondary">Ko‘rsatish</Button>
</form>
<p class="table-count">Jami {data.total} ta javob</p>
{#if data.rows.length}<table class="admin-table review-table"><thead><tr><th>O‘quvchi / dars</th><th>Savol va javob</th><th>Holat</th><th><span class="visually-hidden">Amallar</span></th></tr></thead><tbody>
  {#each data.rows as row}<tr><td data-label="O‘quvchi / dars"><a href="/admin/students/{row.studentId}"><strong>{row.name}</strong></a><small>{row.group ?? 'Guruhsiz'} · {row.title ?? 'Asl dars mavjud emas'} · v{row.version ?? '?'}</small><small>{date(row.submittedAt)}</small></td><td data-label="Savol va javob"><p>{row.prompt ?? 'Asl savol matni mavjud emas'}</p><p class="response-preview">{row.response}</p></td><td data-label="Holat">{row.status === 'pending' ? 'Baholash kutilmoqda' : `${row.points} / ${row.maximum}`} {#if row.feedback}<small>Izoh mavjud</small>{/if}</td><td><a class="row-link" href="/admin/attempts/{row.attemptId}#q-{row.questionId}">{data.reviewed ? 'Ko‘rish / o‘zgartirish' : 'Baholash'} →</a></td></tr>{/each}
</tbody></table>{:else}<div class="admin-empty"><h2>{data.reviewed ? 'Tekshirilgan javoblar yo‘q' : 'Baholash kutilayotgan javoblar yo‘q'}</h2><p>Darslar va yozma javoblar topshirilganda shu yerda ko‘rinadi. Filtrlarni ham tekshirishingiz mumkin.</p></div>{/if}
<Pagination page={data.page} total={data.total} />
