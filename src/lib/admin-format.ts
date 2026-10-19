export function date(value: Date | string | null | undefined) {
  return value ? new Intl.DateTimeFormat('uz-Latn-UZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tashkent' }).format(new Date(value)) : 'Hali faoliyat yo‘q';
}
export function score(points: number | null, maximum: number | null, pending = false) {
  return maximum ? `${points ?? 0} / ${maximum}${pending ? ' · Baholash kutilmoqda' : ''}` : 'Hali baholanmagan';
}
export function safeMediaUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try { return new URL(value).protocol === 'https:' ? value : null; } catch { return null; }
}
