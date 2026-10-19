import { dev } from '$app/env';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { ENTRY_COOKIE, resolveEntry, SESSION_COOKIE } from '#lib/server/sessions';
import { ServiceError } from '#lib/server/validation';
import { normalizeName } from '#lib/server/validation';
import { TEACHER_ENTRY_NAME } from '$app/env/private';
import { createTeacherSession, endTeacherSession, matchesTeacherEntry, TEACHER_COOKIE } from '#lib/server/teacher-sessions';
import { endSession } from '#lib/server/sessions';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.teacher) redirect(303, '/admin');
  if (locals.student) redirect(303, '/home');
  return { unavailable: locals.sessionUnavailable };
};
export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const raw = form.get('name');
    // Never reflect the configured entry value or its normalized variants into HTML.
    const reserved = typeof raw === 'string' && !!TEACHER_ENTRY_NAME && normalizeName(raw) === normalizeName(TEACHER_ENTRY_NAME);
    const name = typeof raw === 'string' && !reserved ? raw.slice(0, 120) : '';
    if (matchesTeacherEntry(raw, TEACHER_ENTRY_NAME)) {
      let teacher;
      try {
        await endSession(getDb(), cookies.get(SESSION_COOKIE));
        await endTeacherSession(getDb(), cookies.get(TEACHER_COOKIE));
        teacher = await createTeacherSession(getDb());
      } catch { return fail(503, { name: '', error: 'Hozir kirib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.' }); }
      cookies.delete(SESSION_COOKIE, { path: '/' });
      cookies.delete(ENTRY_COOKIE, { path: '/' });
      cookies.set(TEACHER_COOKIE, teacher.token, { path: '/', httpOnly: true, secure: !dev, sameSite: 'lax', expires: teacher.expiresAt });
      redirect(303, '/admin');
    }
    if (reserved) return fail(400, { name: '', error: 'Bu ism bilan faol profil topilmadi. Ismingizni tekshiring.' });
    let session;
    try {
      await endTeacherSession(getDb(), cookies.get(TEACHER_COOKIE));
      await endSession(getDb(), cookies.get(SESSION_COOKIE));
      session = await resolveEntry(getDb(), raw);
    } catch (e) {
      if (e instanceof ServiceError) return fail(e.status, { name, error: e.message });
      return fail(503, { name, error: 'Hozir kirib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.' });
    }
    cookies.set(SESSION_COOKIE, session.token, { path: '/', httpOnly: true, secure: !dev, sameSite: 'lax', expires: session.expiresAt });
    cookies.delete(TEACHER_COOKIE, { path: '/' });
    cookies.delete(ENTRY_COOKIE, { path: '/' });
    redirect(303, '/home');
  }
};
