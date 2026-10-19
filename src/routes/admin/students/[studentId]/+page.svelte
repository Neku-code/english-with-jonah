<script lang="ts">
  import AdminForm from '#lib/components/AdminForm.svelte';
  import TextInput from '#lib/components/TextInput.svelte';
  import Button from '#lib/components/Button.svelte';
  import Pagination from '#lib/components/Pagination.svelte';
  import { date, score } from '#lib/admin-format.ts';
  let { data, form } = $props();
</script>
<svelte:head><title>{data.student.displayName} · O‘quvchi</title></svelte:head>
<a class="back-link" href="/admin/students">← O‘quvchilar</a>
<div class="admin-heading"><h1>{data.student.displayName}</h1><p class="muted">{data.student.groupLabel ?? 'Guruh ko‘rsatilmagan'} · Profil {data.student.id.slice(-6).toUpperCase()} · <span class="badge">{data.student.status === 'active' ? 'Faol' : 'Nofaol'}</span></p><p class="muted">So‘nggi o‘qish faoliyati: {date(data.student.lastLearningAt)}</p></div>
{#if form?.error}<p class="feedback feedback--error" role="alert">{form.error}</p>{/if}
{#if form?.message}<p class="feedback feedback--success" role="status">{form.message}</p>{/if}
<details class="admin-panel" open={!!form?.error}><summary>Profilni boshqarish</summary>
  {#key data.student.updatedAt}
  <AdminForm action="?/rename">{#snippet children(busy)}
    <div class="admin-form-grid"><TextInput id="rename-name" name="name" label="Ism va familiya" value={data.student.displayName} required maxlength={120} /><TextInput id="rename-group" name="group" label="Guruh (ixtiyoriy)" value={data.student.groupLabel ?? ''} maxlength={80} /></div>
    <p class="field__help">Ism yangilansa ham profil raqami va barcha natijalar saqlanadi.</p>
    <Button type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'O‘zgarishlarni saqlash'}</Button>
  {/snippet}</AdminForm>
  {/key}
  <div class="archive-area">
    {#if data.student.status === 'active'}
      <p>Profilni nofaol qilish kirishni yopadi va ochiq sessiyalarni tugatadi. Barcha javoblar va natijalar saqlanadi.</p>
      <AdminForm action="?/archive">{#snippet children(busy)}<Button type="submit" variant="secondary" disabled={busy}>{busy ? 'Bajarilmoqda…' : 'Profilni nofaol qilish'}</Button>{/snippet}</AdminForm>
    {:else}
      <p>Bu profilga kirish yopilgan. Faollashtirilganda o‘quvchi o‘z ismi bilan yana kira oladi.</p>
      <AdminForm action="?/reactivate">{#snippet children(busy)}<Button type="submit" variant="secondary" disabled={busy}>{busy ? 'Bajarilmoqda…' : 'Profilni faollashtirish'}</Button>{/snippet}</AdminForm>
    {/if}
  </div>
</details>
<section class="admin-panel"><h2>Coin qo‘shish yoki ayirish</h2><p>Joriy balans: <strong>{data.home.totalPoints} coin</strong>. Manfiy balansga ham ruxsat beriladi.</p>
 <AdminForm action="?/coins">{#snippet children(busy)}
  <input type="hidden" name="requestId" value={data.coinRequestId} />
  <div class="admin-form-grid"><label class="field">Amal<select name="operation"><option value="add">Qo‘shish (+)</option><option value="subtract">Ayirish (−)</option></select></label><label class="field">Miqdor<input name="amount" type="number" min="1" step="1" required inputmode="numeric" /></label></div>
  <label class="field">Izoh (ixtiyoriy)<input name="reason" maxlength="500" /></label>
  <Button type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Coinni yangilash'}</Button>
 {/snippet}</AdminForm>
 {#if data.adjustments.length}<details><summary>So‘nggi o‘zgarishlar</summary><ul>{#each data.adjustments as adjustment}<li>{adjustment.delta > 0 ? '+' : ''}{adjustment.delta} coin · {date(adjustment.createdAt)}{adjustment.reason ? ` · ${adjustment.reason}` : ''}</li>{/each}</ul></details>{/if}
</section>
<h2>O‘qish jarayoni</h2>
<p><strong>{data.home.totalPoints} coin</strong> · Reyting ballari</p>
<dl class="admin-metrics"><div><dt>Tugallangan darslar</dt><dd>{data.finished}</dd></div><div><dt>Davom etayotgan darslar</dt><dd>{data.underway}</dd></div><div><dt>Topshirilgan urinishlar</dt><dd>{data.submitted}</dd></div></dl>
{#if !data.total && !data.vocabTotal}<p class="admin-empty">O‘quvchi hali o‘qishni boshlamagan.</p>{/if}
{#each data.home.units as unit}<div class="admin-panel"><h3>{unit.title}</h3><p>{unit.finished} / {unit.total} dars tugallangan · {unit.points} / {unit.maximumPoints} coin · {unit.mastered ? 'O‘zlashtirilgan' : 'Hali o‘zlashtirilmagan'}</p>
  {#if unit.examResult}<p>Yakuniy imtihon: {score(unit.examResult.earnedPoints, unit.examResult.maxPoints, unit.examResult.pendingReview)}</p>{/if}
  <ul class="admin-lesson-list">{#each unit.lessons as lesson}<li><span>{lesson.title}</span><span class="badge">{lesson.mastered ? 'O‘zlashtirilgan' : lesson.completed ? 'Tugallangan' : lesson.inProgress ? 'Boshlangan · topshirilmagan' : data.lessonStates.some(a => a.lessonId === lesson.id && a.submitted) ? 'Urinish topshirilgan' : 'Hali boshlanmagan'}</span></li>{/each}</ul>
</div>{/each}
{#if data.completed.length}<details class="admin-panel"><summary>Tugallangan darslar tarixi ({data.completed.length})</summary><ul>{#each data.completed as lesson}<li>{lesson.title ?? 'Asl dars mavjud emas'} · {date(lesson.completedAt)}</li>{/each}</ul></details>{/if}
<section class="admin-section"><h2>Urinishlar tarixi</h2><p class="muted">Har bir urinish alohida saqlanadi. Boshlangan urinish hali topshirilmagan bo‘lishi mumkin.</p>
  {#if data.attempts.length}<table class="admin-table"><thead><tr><th>Dars / versiya</th><th>Holat va ball</th><th>Sanalar</th><th><span class="visually-hidden">Amallar</span></th></tr></thead><tbody>
    {#each data.attempts as row}<tr><td data-label="Dars"><strong>{row.title ?? 'Asl dars mavjud emas'}</strong><small>Versiya {row.version ?? 'noma’lum'} · Urinish {row.attempt.id.slice(-6).toUpperCase()}</small></td><td data-label="Holat va ball">{row.attempt.status === 'submitted' ? score(row.attempt.earnedPoints, row.attempt.maxPoints, row.attempt.pendingReview) : 'Boshlangan · hali topshirilmagan'}</td><td data-label="Sanalar"><small>Boshlandi: {date(row.attempt.startedAt)}</small>{#if row.attempt.submittedAt}<small>Topshirildi: {date(row.attempt.submittedAt)}</small>{/if}</td><td><a class="row-link" href="/admin/attempts/{row.attempt.id}">Javoblarni ko‘rish →</a></td></tr>{/each}
  </tbody></table>{:else}<p class="admin-empty">Hali dars urinishi yo‘q.</p>{/if}
  <Pagination page={data.page} total={data.total} />
</section>
<section class="admin-section"><h2>Lug‘at natijalari</h2>{#if data.vocab.length}<ul class="admin-lesson-list">{#each data.vocab as result}<li><span>{result.title ?? 'Asl dars mavjud emas'} · v{result.version ?? '?'}<small>{date(result.createdAt)}</small></span><span>{result.correct} / {result.total} · {100 * result.correct >= 75 * result.total ? 'O‘tilgan' : 'Hali o‘tilmagan'}</span></li>{/each}</ul><Pagination page={data.page} total={data.vocabTotal} />{:else}<p class="admin-empty">Hali lug‘at natijasi yo‘q.</p>{/if}</section>
