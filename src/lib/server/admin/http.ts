import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ServiceError } from '../validation';

export function requireTeacher(event: RequestEvent) {
  if (event.locals.sessionUnavailable) error(503, 'Xizmat vaqtincha ishlamayapti. Qayta urinib ko‘ring.');
  if (!event.locals.teacher) redirect(303, '/');
  return event.locals.teacher;
}
export async function adminAction(event: RequestEvent, work: (form: FormData, teacherId: string) => Promise<{ message: string }>) {
  const teacher = requireTeacher(event);
  if (event.request.headers.get('origin') !== event.url.origin) error(403, 'So‘rov manbasi noto‘g‘ri.');
  try {
    const reader = event.request.body?.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    if (reader) while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 65_536) { await reader.cancel(); return fail(413, { error: 'So‘rov juda katta.' }); }
      chunks.push(part.value);
    }
    const request = new Request(event.request.url, { method: 'POST', headers: { 'content-type': event.request.headers.get('content-type') ?? '' }, body: Buffer.concat(chunks) });
    return await work(await request.formData(), teacher.id);
  } catch (e) {
    if (e instanceof ServiceError) return fail(e.status, { error: e.message });
    return fail(503, { error: 'Saqlab bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.' });
  }
}
export async function adminRead<T>(event: RequestEvent, work: () => Promise<T>): Promise<T> {
  requireTeacher(event);
  try { return await work(); }
  catch (e) {
    if (e instanceof ServiceError) error(e.status, e.message);
    error(503, 'Ma’lumotlarni yuklab bo‘lmadi. Sahifani qayta yuklang.');
  }
}
