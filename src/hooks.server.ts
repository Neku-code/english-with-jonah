import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { getDb } from '#lib/server/db';
import { restoreSession, SESSION_COOKIE, validToken } from '#lib/server/sessions';
import { restoreTeacherSession, TEACHER_COOKIE } from '#lib/server/teacher-sessions';
import { json, redirect, error } from '@sveltejs/kit';
import { TEACHER_ENTRY_NAME } from '$app/env/private';
import { configureTeacherEntry } from '#lib/server/teacher-config';

export const handle: Handle = async ({ event, resolve }) => {
  configureTeacherEntry(TEACHER_ENTRY_NAME);
  event.locals.student = null;
  event.locals.teacher = null;
  event.locals.sessionUnavailable = false;
  const token = event.cookies.get(SESSION_COOKIE);
  const teacherToken = event.cookies.get(TEACHER_COOKIE);
  if (teacherToken && !validToken(teacherToken)) event.cookies.delete(TEACHER_COOKIE, { path: '/' });
  if (validToken(teacherToken) && event.url.pathname !== '/api/health') {
    try {
      event.locals.teacher = await restoreTeacherSession(getDb(), teacherToken);
      if (!event.locals.teacher) event.cookies.delete(TEACHER_COOKIE, { path: '/' });
    } catch { event.locals.sessionUnavailable = true; }
  }
  if (token && !validToken(token)) event.cookies.delete(SESSION_COOKIE, { path: '/' });
  if (!event.locals.teacher && validToken(token) && event.url.pathname !== '/api/health') {
    try {
      event.locals.student = await restoreSession(getDb(), token);
      if (!event.locals.student) event.cookies.delete(SESSION_COOKIE, { path: '/' });
    } catch { event.locals.sessionUnavailable = true; }
  }
  // Hooks cover pages, independent data requests, endpoints and form actions.
  if (/^\/(?:admin|api\/admin)(?:\/|$)/.test(event.url.pathname) && !event.locals.teacher) {
    if (event.url.pathname.startsWith('/api/')) return json({ message: 'O‘qituvchi sifatida kiring.' }, { status: event.locals.sessionUnavailable ? 503 : 401, headers: { 'Cache-Control': 'private, no-store' } });
    if (event.locals.sessionUnavailable) error(503, 'Profilni yuklab bo‘lmadi. Qayta urinib ko‘ring.');
    redirect(303, '/');
  }
  const response = await resolve(event);
  if (event.url.pathname !== '/api/health') {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  return response;
};
export const handleError: HandleServerError = () => {
  // Never serialize/log driver errors; connection strings can be included in them.
  console.error('A server request failed. Check private configuration and database availability.');
  return { message: 'Xizmat vaqtincha ishlamayapti. Birozdan so‘ng qayta urinib ko‘ring.' };
};
