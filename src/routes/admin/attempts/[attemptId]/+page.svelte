<script lang="ts">
  import AdminForm from '#lib/components/AdminForm.svelte';
  import TeacherQuestion from '#lib/components/TeacherQuestion.svelte';
  import Button from '#lib/components/Button.svelte';
  import { date, score } from '#lib/admin-format.ts';
  import {readableResponse} from '#lib/learning/response.ts';
  let { data, form } = $props();
</script>
<svelte:head><title>Urinish tafsilotlari · English with Jonah</title></svelte:head>
<a class="back-link" href="/admin/students/{data.student.id}">← {data.student.displayName}</a>
<div class="admin-heading"><h1>{data.version?.title ?? 'Asl dars mavjud emas'}</h1><p class="muted">{data.student.displayName} · Dars versiyasi {data.version?.version ?? 'noma’lum'}</p><p class="mono muted">Urinish: {data.attempt.id}<br />Kontent: {data.attempt.versionId}</p></div>
<dl class="attempt-meta"><div><dt>Boshlandi</dt><dd>{date(data.attempt.startedAt)}</dd></div><div><dt>Topshirildi</dt><dd>{data.attempt.submittedAt ? date(data.attempt.submittedAt) : 'Hali topshirilmagan'}</dd></div><div><dt>Natija</dt><dd>{data.attempt.status === 'submitted' ? score(data.attempt.earnedPoints, data.attempt.maxPoints, data.attempt.pendingReview) : 'Boshlangan · hali topshirilmagan'}</dd></div></dl>
{#if form?.error}<p class="feedback feedback--error" role="alert">{form.error}</p>{/if}
{#if form?.message}<p class="feedback feedback--success" role="status">{form.message}</p>{/if}
{#if !data.version}<p class="feedback">Asl kontent versiyasi mavjud emas. Saqlangan javoblar o‘z holicha ko‘rsatiladi.</p>{/if}
{#if data.support}<p class="notice">Tinglash: {data.support.audioPlays} marta · {data.support.audioStatus==='completed'?'Tugallangan':data.support.audioStatus==='failed'?'Ovoz ishlamagan':'Tugallanmagan'} · Matn yordami: {data.support.transcriptUsed?'ishlatilgan':'ishlatilmagan'}</p>{/if}
{#each data.questions as q}
  {@const history = data.reviews.filter(r => r.questionId === q.questionId)}
  <article class="admin-panel question-panel" id="q-{q.questionId}">
    <h2>{q.position ?? '—'}-savol</h2><p class="mono muted">{q.questionId}</p>
    <TeacherQuestion content={q.content} versionContent={data.version?.content ?? {}} />
    <h3>O‘quvchi javobi</h3>
    <div class="stored-response">{q.response?.trim() ? readableResponse(q.response) : data.attempt.status === 'submitted' ? 'Javob berilmagan' : 'Hali javob saqlanmagan'}</div>
    {#if data.checks.some(c=>c.questionId===q.questionId)}<details><summary>Mashq urinishlari ({data.checks.filter(c=>c.questionId===q.questionId).length})</summary>{#each data.checks.filter(c=>c.questionId===q.questionId) as check,i}<p>{i===0?'Birinchi urinish':`${i+1}-urinish`} · {date(check.createdAt)} · {check.reviewStatus==='pending'?'Baholash kutilmoqda':`${check.earnedPoints} / ${q.maxPoints}`} · Matn yordami: {check.transcriptUsed?'ha':'yo‘q'}</p><pre class="stored-response">{readableResponse(check.response)}</pre>{/each}</details>{/if}
    {#if q.grading}<details class="grading-details"><summary>To‘g‘ri javob / baholash qoidasi</summary>
      {#if q.grading.mode === 'manual'}<p>O‘qituvchi baholaydi. Maksimal ball: {q.maxPoints ?? 'belgilanmagan'}.</p>
      {:else if q.grading.mode === 'choice'}<p>To‘g‘ri variant: {q.grading.correctOptionId} — {q.content?.options?.find(o => q.grading?.mode === 'choice' && o.id === q.grading.correctOptionId)?.label ?? ''}</p>
      {:else if q.grading.mode === 'exact'}<p>Qabul qilinadigan javoblar: {q.grading.accepted.join('; ')}</p><p>Harf kattaligi: {q.grading.caseSensitive ? 'hisobga olinadi' : 'hisobga olinmaydi'}. Apostrof variantlari: {q.grading.normalizeApostrophes ? 'tenglashtiriladi' : 'tenglashtirilmaydi'}.</p>
      {:else if q.grading.mode==='authored'}<p>{q.grading.feedback}</p><p class="stored-response">{q.grading.notes}</p>{/if}
    </details>{:else}<p class="feedback">Asl baholash qoidasi mavjud emas. Raqamli baholash sozlamasini tekshirish kerak.</p>{/if}
    <dl class="attempt-meta"><div><dt>Asl avtomatik natija</dt><dd>{q.automaticStatus === 'pending' ? 'O‘qituvchi bahosi kutilmoqda' : q.automaticStatus === 'graded' ? score(q.automaticPoints, q.maxPoints) : 'Hali baholanmagan'}</dd></div><div><dt>Joriy natija</dt><dd>{q.status === 'pending' ? 'Baholash kutilmoqda' : q.status === 'graded' ? score(q.points, q.maxPoints) : 'Hali baholanmagan'}</dd></div></dl>
    {#if q.feedback}<h3>O‘qituvchi izohi</h3><p class="stored-response">{q.feedback}</p>{/if}
    {#if data.attempt.status === 'submitted' && (q.grading?.mode === 'manual' || q.automaticStatus === 'pending') && q.response !== null}
      {#key `${q.questionId}-${q.reviewRevision ?? 0}`}
      <details class="review-editor" open={!q.reviewRevision}><summary>{q.reviewRevision ? 'Bahoni va izohni o‘zgartirish' : 'Javobni baholash'}</summary>
        <AdminForm action="?/review">{#snippet children(busy)}
          <input type="hidden" name="questionId" value={q.questionId} /><input type="hidden" name="requestId" value={q.requestId} /><input type="hidden" name="expectedRevision" value={q.reviewRevision ?? 0} />
          <div class="field"><label for="points-{q.questionId}">Ball {q.maxPoints ? `(0–${q.maxPoints})` : ''}</label><input id="points-{q.questionId}" type="number" name="points" min="0" max={q.maxPoints ?? undefined} step="1" value={q.reviewRevision ? q.points ?? '' : ''} disabled={!q.maxPoints} />
          <p class="field__help">{q.maxPoints ? 'Ball kiritilmasa, izoh saqlanadi va javob baholashni kutishda davom etadi.' : 'Maksimal ball belgilanmagan. Faqat izoh saqlash mumkin; raqamli baholash mavjud emas.'}</p></div>
          <div class="field"><label for="feedback-{q.questionId}">O‘quvchi uchun izoh</label><textarea id="feedback-{q.questionId}" name="feedback" maxlength="10000" rows="4">{q.feedback ?? ''}</textarea></div>
          <Button type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Baholashni saqlash'}</Button>
        {/snippet}</AdminForm>
      </details>{/key}
    {/if}
    {#if history.length}<details class="review-history"><summary>Baholash tarixi ({history.length})</summary><ol>{#each history as review}<li><strong>{review.revision}-baholash · {date(review.createdAt)}</strong><p>{review.awardedPoints === null ? 'Faqat izoh · baho kutilmoqda' : score(review.awardedPoints, q.maxPoints)}</p><p class="stored-response">{review.feedback || 'Izoh berilmagan'}</p></li>{/each}</ol></details>{/if}
  </article>
{/each}
{#if !data.questions.length}<p class="admin-empty">Bu urinish uchun savol yoki saqlangan javob topilmadi.</p>{/if}
