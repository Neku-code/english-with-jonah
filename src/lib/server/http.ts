import { error, json, redirect, type RequestEvent } from '@sveltejs/kit';
import { ServiceError } from './validation';

export function requireStudent(event: RequestEvent) {
  if (event.locals.sessionUnavailable) error(503, 'Profilni yuklab bo‘lmadi. Qayta urinib ko‘ring.');
  if (!event.locals.student) redirect(303, '/');
  return event.locals.student;
}
export async function api(event: RequestEvent, work: (studentId: string, body: Record<string, unknown>) => Promise<unknown>) {
  try {
    if (event.locals.sessionUnavailable) return json({ code: 'UNAVAILABLE', message: 'Xizmat vaqtincha ishlamayapti. Qayta urinib ko‘ring.' }, { status: 503 });
    if (!event.locals.student) return json({ code: 'SESSION_ENDED', message: 'Qayta kiring.' }, { status: 401 });
    let body: Record<string, unknown> = {};
    if (event.request.method !== 'GET') {
      if (event.request.headers.get('origin') !== event.url.origin) return json({ message: 'So‘rov manbasi noto‘g‘ri.' }, { status: 403 });
      if (event.request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ message: 'JSON so‘rov kutilgan.' }, { status: 415 });
      // A byte cap also applies when Content-Length is absent or false.
      const reader = event.request.body?.getReader();
      if (!reader) return json({ message: 'So‘rov bo‘sh.' }, { status: 400 });
      const chunks: Uint8Array[] = []; let bytes = 0;
      while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length;
        if (bytes > 32_768) { await reader.cancel(); return json({ message: 'So‘rov juda katta.' }, { status: 413 }); } chunks.push(chunk.value); }
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json({ message: 'So‘rov noto‘g‘ri.' }, { status: 400 }); }
      if (!body || typeof body !== 'object' || Array.isArray(body) || 'studentId' in body) return json({ message: 'So‘rov ma’lumotlari noto‘g‘ri.' }, { status: 400 });
    }
    return json(await work(event.locals.student.id, body));
  } catch (e) {
    if (e instanceof ServiceError) return json({ code: e.code, message: e.message }, { status: e.status });
    return json({ code: 'UNAVAILABLE', message: 'Saqlab bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.' }, { status: 503 });
  }
}
