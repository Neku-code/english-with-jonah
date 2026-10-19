import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { testDatabase } from './database';
import { fixture } from './fixtures';
import { archiveStudent, findStudents } from '../src/lib/server/students';

let store: Awaited<ReturnType<typeof testDatabase>>, app: ChildProcess, base: string;
before(async () => {
  store = await testDatabase();
  const probe = createServer(); await new Promise<void>(done => probe.listen(0, '127.0.0.1', done));
  const port = (probe.address() as { port: number }).port; await new Promise<void>(done => probe.close(() => done()));
  base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    env: { ...process.env, DATABASE_URL: store.url, JONAH_TEST_NAMESPACE: `student-${port}` }, stdio: 'ignore', windowsHide: true
  });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(base + '/api/health')).ok) return; } catch { /* wait for Vite */ }
    if (app.exitCode !== null) throw new Error('Test application exited during startup');
    await delay(200);
  }
  throw new Error('Test application startup timed out');
});
after(async () => {
  if (app && app.exitCode === null) { const done = new Promise<void>(resolve => app.once('exit', () => resolve())); app.kill(); await done; }
  await store?.close();
});
class Browser {
  cookies = new Map<string, string>();
  async fetch(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; '));
    const response = await fetch(base + path, { ...init, headers, redirect: 'manual' });
    for (const cookie of response.headers.getSetCookie()) { const [key, value] = cookie.split(';')[0].split('='); if (value) this.cookies.set(key, value); else this.cookies.delete(key); }
    return response;
  }
  form(path: string, body: Record<string, string>) { return this.fetch(path, { method: 'POST', headers: { origin: base, accept: 'text/html' }, body: new URLSearchParams(body) }); }
  json(path: string, body: unknown = {}, method = 'POST', origin = base) { return this.fetch(path, { method, headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
}
test('HTTP any-name entry, automatic creation, cookie restore, same-name access, switch and archival', async () => {
  const browser = new Browser();
  const root = await browser.fetch('/'); assert.equal(root.status, 200); const entryHtml = await root.text(); assert.match(entryHtml, /Ismingiz/); assert.match(entryHtml, /Yangi ism bilan yangi profil ochiladi/); assert.doesNotMatch(entryHtml, /Ro‘yxatdagi|type="radio"/);
  assert.equal((await browser.form('/', { name: '  ' })).status, 400);
  const login = await browser.form('/', { name: '  Sinov   O‘quvchisi ' }); assert.equal(login.status, 303); assert.equal(login.headers.get('location'), '/home');
  const student = (await findStudents(store.db, 'Sinov O‘quvchisi'))[0]; assert.ok(student);
  const sessionCookie = login.headers.getSetCookie().find(c => c.startsWith('ewj_session=')); assert.match(sessionCookie!, /HttpOnly/i); assert.match(sessionCookie!, /SameSite=Lax/i);
  const home = await browser.fetch('/home'); assert.equal(home.status, 200); const html = await home.text(); assert.match(html, /Darslar hali qo‘shilmagan/); assert.match(html, /Sinov O‘quvchisi/); assert.doesNotMatch(html, /Davom ettirish|So‘nggi faoliyat/); assert.ok(!html.includes('/learn/'));
  assert.match(home.headers.get('cache-control')!, /no-store/);
  assert.equal((await browser.fetch('/')).headers.get('location'), '/home');
  assert.equal((await browser.form('/switch', {})).status, 303); assert.equal((await browser.fetch('/home')).headers.get('location'), '/');
  const peer = new Browser();
  assert.equal((await peer.form('/', { name: '  SINOV   OʻQUVCHISI ' })).status, 303);
  assert.match(await (await peer.fetch('/home')).text(), /Sinov O‘quvchisi/);
  assert.equal((await findStudents(store.db, 'sinov oʼquvchisi')).length, 1);
  assert.equal((await browser.form('/', { mode: 'select', profile: student.id })).status, 400); // Old profile-ID selection cannot enter.
  await browser.form('/', { name: 'Sinov O‘quvchisi' });
  await archiveStudent(store.db, student.id);
  assert.equal((await browser.fetch('/home')).headers.get('location'), '/');
  assert.ok(!browser.cookies.has('ewj_session'));
  const archived = await browser.form('/', { name: 'sinov o`quvchisi' }); assert.equal(archived.status, 403); assert.match(await archived.text(), /profil nofaol/);
});
test('HTTP API session ownership, CSRF, validation, safe DTO, revisions and idempotent results', async () => {
  const a = new Browser(), b = new Browser(), anonymous = new Browser();
  await a.form('/', { name: 'API person A' }); await b.form('/', { name: 'API person B' });
  const f = await fixture(store.db);
  const path = `/api/lessons/${f.lesson.id}/attempts`;
  assert.equal((await anonymous.json(path)).status, 401);
  assert.equal((await a.json(path, {}, 'POST', 'https://another-origin.invalid')).status, 403);
  assert.equal((await a.json(path, { studentId: 'not-trusted' })).status, 400);
  assert.equal((await a.fetch(path, { method: 'POST', headers: { origin: base, 'content-type': 'application/jsonx' }, body: '{}' })).status, 415);
  const start = await a.json(path); assert.equal(start.status, 200); const attempt = await start.json();
  assert.equal((await b.fetch(`/api/attempts/${attempt.id}`)).status, 404);
  const dto = await (await a.fetch(`/api/attempts/${attempt.id}`)).json(); assert.ok(dto.questions.length); assert.equal(dto.questions[0].grading, undefined); assert.ok(!JSON.stringify(dto).includes('accepted'));
  const answers = `/api/attempts/${attempt.id}/answers`;
  assert.equal((await a.json(answers, { questionId: f.question.id, response: 123, expectedRevision: 0 }, 'PUT')).status, 400);
  assert.equal((await a.json(answers, { questionId: f.question.id, response: 'token', expectedRevision: 0 }, 'PUT')).status, 200);
  assert.equal((await a.json(answers, { questionId: f.question.id, response: 'stale', expectedRevision: 0 }, 'PUT')).status, 409);
  const returning = new Browser();
  assert.equal((await returning.form('/', { name: ' api   PERSON A ' })).status, 303);
  const resumed = await (await returning.fetch(`/api/attempts/${attempt.id}`)).json();
  assert.equal(resumed.answers[0].response, 'token');
  const reopened = await (await returning.json(path)).json(); assert.equal(reopened.id, attempt.id);
  assert.match(await (await returning.fetch('/home')).text(), /Davom ettirish/);
  const submit = `/api/attempts/${attempt.id}/submit`;
  const first = await a.json(submit); const repeated = await a.json(submit); assert.deepEqual(await first.json(), await repeated.json());
  assert.equal((await a.json(answers, { questionId: f.question.id, response: 'after-submit', expectedRevision: 1 }, 'PUT')).status, 409);
  const home = await a.fetch('/home'); assert.match(await home.text(), /So‘nggi faoliyat/);
  assert.match(await (await returning.fetch('/home')).text(), /So‘nggi faoliyat/);
});
test('HTTP catalog failures have a recoverable error state, never the empty state', async () => {
  const browser = new Browser(); await browser.form('/', { name: 'Failure state person' });
  await store.pool.query('ALTER TABLE units RENAME TO temporarily_unavailable_units');
  try {
    const response = await browser.fetch('/home'); const html = await response.text();
    assert.match(html, /Darslarni yuklab bo‘lmadi/); assert.match(html, /Qayta urinish/); assert.doesNotMatch(html, /Darslar hali qo‘shilmagan/);
  } finally { await store.pool.query('ALTER TABLE temporarily_unavailable_units RENAME TO units'); }
  assert.match(await (await browser.fetch('/home')).text(), /Darslaringiz/);
});
test('HTTP reserved administrator entry stays separate from automatic student profiles', async () => {
  const teacher = new Browser();
  const configured = process.env.TEACHER_ENTRY_NAME!;
  const normalized = await teacher.form('/', { name: ` ${configured.toLowerCase()} ` });
  assert.equal(normalized.status, 400);
  const login = await teacher.form('/', { name: configured });
  assert.equal(login.status, 303); assert.equal(login.headers.get('location'), '/admin');
  assert.ok(teacher.cookies.has('ewj_teacher')); assert.ok(!teacher.cookies.has('ewj_session'));
  assert.equal((await teacher.fetch('/admin')).status, 200);
  const { rows } = await store.pool.query('SELECT count(*)::int total FROM students WHERE lookup_name=$1', [configured.toLowerCase()]);
  assert.equal(rows[0].total, 0);
});

test('HTTP rankings are student-only and vocabulary review unlocks without manufacturing a test pass', async () => {
 const anonymous = new Browser();
 assert.equal((await anonymous.fetch('/ranking')).headers.get('location'), '/');
 const a = new Browser(), b = new Browser();
 await a.form('/', { name: 'Ranking HTTP learner' }); await b.form('/', { name: 'Still locked HTTP learner' });
 const f = await fixture(store.db, { vocabulary: true });
 const start = `/api/lessons/${f.lesson.id}/attempts`, vocab = `/api/lessons/${f.lesson.id}/vocabulary`;
 assert.equal((await a.json(start)).status, 409);
 assert.equal((await a.json(vocab, { action: 'review', studentId: 'spoof' })).status, 400);
 assert.equal((await a.json(vocab, { action: 'review' }, 'POST', 'https://another.invalid')).status, 403);
 assert.equal((await a.json(vocab, { action: 'review' })).status, 200);
 assert.equal((await a.json(vocab, { action: 'review' })).status, 200);
 assert.equal((await b.json(start)).status, 409);
 const before = await (await a.fetch('/ranking')).text();assert.match(before, /Ranking HTTP learner/);assert.match(before, /Sizning o‘rningiz/);
 const attempt = await (await a.json(start)).json();
 await a.json(`/api/attempts/${attempt.id}/answers`, { questionId: f.question.id, response: 'token', expectedRevision: 0 }, 'PUT');
 await a.json(`/api/attempts/${attempt.id}/submit`);
 const result = await a.fetch('/ranking');assert.equal(result.status, 200);assert.match(result.headers.get('cache-control')!, /no-store/);
 const html = await result.text();assert.match(html, /50/);assert.doesNotMatch(html, /acceptedTranslations|lookupName|groupLabel/);
 const teacher = new Browser();await teacher.form('/', { name: process.env.TEACHER_ENTRY_NAME! });
 assert.equal((await teacher.fetch('/ranking')).headers.get('location'), '/');
});
