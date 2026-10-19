<script lang="ts">let { data } = $props();</script>
<svelte:head><title>Umumiy holat · English with Jonah</title></svelte:head>
<div class="admin-heading"><h1>Umumiy holat</h1><p class="muted">O‘quvchilar va o‘qish jarayoni bir joyda.</p></div>
<dl class="admin-metrics">
  <div><dt>Faol o‘quvchilar</dt><dd>{data.counts.active}</dd></div>
  <div><dt>O‘qishni boshlaganlar</dt><dd>{data.counts.started}</dd></div>
  <div><dt>Topshirilgan urinishlar</dt><dd>{data.counts.submitted}</dd></div>
  <div><dt>Baholash kutilmoqda</dt><dd>{data.counts.pending}</dd></div>
</dl>
<p class="field__help">Boshlaganlar — kamida bir dars urinishi yoki lug‘at natijasi bor barcha o‘quvchilar. Topshirilgan urinishlar va kutilayotgan javoblar nofaol o‘quvchilar tarixini ham o‘z ichiga oladi.</p>
<div class="admin-panel">
  <h2>{data.counts.lessons ? 'O‘qish natijalari' : 'Darslar hali qo‘shilmagan'}</h2>
  <p class="muted">{data.counts.submitted ? 'Har bir urinish va yozma javobni o‘quvchi sahifasidan ko‘rishingiz mumkin.' : 'Hali topshirilgan urinish yo‘q. Darslar qo‘shilib, o‘quvchilar javob yuborganida natijalar shu yerda paydo bo‘ladi.'}</p>
  <div class="actions"><a class="button button--primary" href="/admin/students">O‘quvchilarni boshqarish</a><a class="button button--secondary" href="/admin/reviews">Javoblarni tekshirish{data.counts.pending ? ` (${data.counts.pending})` : ''}</a></div>
</div>
