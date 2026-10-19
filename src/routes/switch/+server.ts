import { dev } from '$app/env';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db';
import { endSession, ENTRY_COOKIE, SESSION_COOKIE } from '#lib/server/sessions';
import { endTeacherSession, TEACHER_COOKIE } from '#lib/server/teacher-sessions';

export const POST: RequestHandler = async ({ request, url, cookies }) => {
  if (request.headers.get('origin') !== url.origin) error(403, 'So‘rov manbasi noto‘g‘ri.');
  try { await endSession(getDb(), cookies.get(SESSION_COOKIE)); await endTeacherSession(getDb(), cookies.get(TEACHER_COOKIE)); }
  catch { error(503, 'Profilni almashtirib bo‘lmadi. Qayta urinib ko‘ring.'); }
  cookies.delete(SESSION_COOKIE, { path: '/', secure: !dev });
  cookies.delete(ENTRY_COOKIE, { path: '/' });
  cookies.delete(TEACHER_COOKIE, { path: '/' });
  redirect(303, '/');
};
