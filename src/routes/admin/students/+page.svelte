<script lang="ts">
  import AdminForm from '#lib/components/AdminForm.svelte';
  import TextInput from '#lib/components/TextInput.svelte';
  import Button from '#lib/components/Button.svelte';
  import Pagination from '#lib/components/Pagination.svelte';
  import { date } from '#lib/admin-format.ts';
  let { data, form } = $props();
</script>
<svelte:head><title>O‘quvchilar · English with Jonah</title></svelte:head>
<div class="admin-heading"><h1>O‘quvchilar</h1><p class="muted">Profil yarating, ma’lumotlarni yangilang va o‘qish tarixini ko‘ring.</p></div>
{#if form?.error}<p class="feedback feedback--error" role="alert">{form.error}</p>{/if}
{#if form?.message}<p class="feedback feedback--success" role="status">{form.message}</p>{/if}
<details class="admin-panel" open={!!form?.error}><summary>+ O‘quvchi qo‘shish</summary>
  <AdminForm action="?/add">{#snippet children(busy)}
    <input type="hidden" name="requestId" value={data.requestId} />
    <div class="admin-form-grid"><TextInput id="new-name" name="name" label="Ism va familiya" required maxlength={120} /><TextInput id="new-group" name="group" label="Guruh (ixtiyoriy)" maxlength={80} /></div>
    <p class="field__help">Har bir ism bitta profilni ochadi. Alohida profil uchun boshqa ism tanlang. O‘quvchilar kirish sahifasida o‘zlari ham profil ochishi mumkin.</p>
    <Button type="submit" disabled={busy}>{busy ? 'Qo‘shilmoqda…' : 'O‘quvchi qo‘shish'}</Button>
  {/snippet}</AdminForm>
</details>
<form class="admin-filters" method="GET">
  <div class="field"><label for="student-search">Ism bo‘yicha qidirish</label><input id="student-search" type="search" name="q" value={data.search} maxlength="120" /></div>
  <div class="field"><label for="student-status">Holati</label><select id="student-status" name="status" value={data.status}><option value="active">Faol</option><option value="archived">Nofaol</option><option value="all">Barchasi</option></select></div>
  <Button type="submit" variant="secondary">Ko‘rsatish</Button>
</form>
<p class="table-count">Jami {data.total} ta o‘quvchi</p>
{#if data.students.length}
  <table class="admin-table"><thead><tr><th>O‘quvchi</th><th>Guruh</th><th>Holat</th><th>So‘nggi o‘qish faoliyati</th><th><span class="visually-hidden">Amallar</span></th></tr></thead>
    <tbody>{#each data.students as student}<tr><td data-label="O‘quvchi"><a href="/admin/students/{student.id}"><strong>{student.displayName}</strong></a><small>Profil {student.id.slice(-6).toUpperCase()}</small></td><td data-label="Guruh">{student.groupLabel ?? 'Ko‘rsatilmagan'}</td><td data-label="Holat"><span class="badge" class:badge--sage={student.status === 'active'}>{student.status === 'active' ? 'Faol' : 'Nofaol'}</span></td><td data-label="So‘nggi faoliyat">{date(student.lastLearningAt)}</td><td><a class="row-link" href="/admin/students/{student.id}">Profilni ochish →</a></td></tr>{/each}</tbody>
  </table>
{:else}<div class="admin-empty"><h2>O‘quvchilar topilmadi</h2><p>Yangi o‘quvchi qo‘shing yoki qidiruv va holat filtrini o‘zgartiring.</p></div>{/if}
<Pagination page={data.page} total={data.total} />
