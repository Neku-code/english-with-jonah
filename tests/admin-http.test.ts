import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { eq } from 'drizzle-orm';
import { testDatabase } from './database';
import { fixture } from './fixtures';
import { createStudent, findStudents } from '../src/lib/server/students';
import { startAttempt, saveAnswer, submitAttempt } from '../src/lib/server/learning/attempts';
import { lessonAttempts, studentSessions, students, teacherReviews, teacherSessions } from '../src/lib/server/db/schema';

let store: Awaited<ReturnType<typeof testDatabase>>, app: ChildProcess, base: string;
before(async () => {
  store = await testDatabase();
  const probe = createServer(); await new Promise<void>(done => probe.listen(0, '127.0.0.1', done));
  const port = (probe.address() as { port: number }).port; await new Promise<void>(done => probe.close(() => done()));
  base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { env: { ...process.env, DATABASE_URL: store.url, JONAH_TEST_NAMESPACE: `teacher-${port}` }, stdio: 'ignore', windowsHide: true });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) { try { if ((await fetch(base + '/api/health')).ok) return; } catch { /* startup */ } if (app.exitCode !== null) throw new Error('Application exited'); await delay(200); }
  throw new Error('Application startup timed out');
});
after(async () => {
  if (app && app.exitCode === null) { const done = new Promise<void>(resolve => app.once('exit', () => resolve())); app.kill(); await done; }
  await store?.close();
});
class Browser {
  cookies = new Map<string,string>();
  async fetch(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; '));
    const result = await fetch(base + path, { ...init, headers, redirect: 'manual' });
    for (const cookie of result.headers.getSetCookie()) { const [key,value] = cookie.split(';')[0].split('='); if (value) this.cookies.set(key,value); else this.cookies.delete(key); }
    return result;
  }
  form(path: string, body: Record<string,string>, origin = base) { return this.fetch(path, { method:'POST', headers: { origin, accept:'text/html' }, body: new URLSearchParams(body) }); }
}
async function teacherBrowser() { const b = new Browser(); const response = await b.form('/', { name: process.env.TEACHER_ENTRY_NAME! }); assert.equal(response.headers.get('location'), '/admin'); return b; }
test('HTTP exact teacher entry, server role, profile switching, protected routes and logout', async () => {
  const configured = process.env.TEACHER_ENTRY_NAME!;
  for (const name of [configured.toLowerCase(), configured.toUpperCase(), ' ' + configured, configured + ' ', configured.slice(0,-1)]) {
    const b = new Browser(); const response = await b.form('/', { name });
    assert.notEqual(response.headers.get('location'), '/admin'); assert.ok(!b.cookies.has('ewj_teacher'));
  }
  const student = new Browser(); await student.form('/', { name: 'HTTP admin student' });
  const [s] = await findStudents(store.db, 'HTTP admin student');
  for (const path of ['/admin','/admin/students','/admin/reviews','/admin/questions',`/admin/students/${s.id}`,`/admin/attempts/${randomUUID()}`]) {
    assert.equal((await student.fetch(path)).headers.get('location'), '/');
    assert.equal((await new Browser().fetch(path)).headers.get('location'), '/');
  }
  const dataRequest = await (await student.fetch('/admin/students/__data.json')).json();
  assert.equal(dataRequest.type, 'redirect'); assert.equal(dataRequest.location, '/');
  assert.equal((await student.form('/admin/students?/add', { name:'Unauthorized',requestId:randomUUID() })).headers.get('location'), '/');
  assert.equal((await student.form(`/admin/students/${s.id}?/archive`, {})).headers.get('location'), '/');
  assert.equal((await student.form(`/admin/attempts/${randomUUID()}?/review`, {})).headers.get('location'), '/');
  assert.equal((await student.fetch('/api/admin/students')).status, 401);
  const originalCookie = student.cookies.get('ewj_session')!;
  const teacherEntry = await student.form('/', { name:configured }); assert.equal(teacherEntry.headers.get('location'),'/admin');
  assert.ok(!student.cookies.has('ewj_session')); assert.ok(student.cookies.has('ewj_teacher'));
  const replay = new Browser(); replay.cookies.set('ewj_session', originalCookie); assert.equal((await replay.fetch('/home')).headers.get('location'), '/');
  assert.match(teacherEntry.headers.getSetCookie().find(c=>c.startsWith('ewj_teacher='))!, /HttpOnly/);
  const overview = await student.fetch('/admin'); const html = await overview.text();
  assert.equal(overview.status, 200); assert.match(html, /Darslar hali qo‘shilmagan/); assert.ok(!html.includes(configured));
  assert.equal((await student.form('/admin/students?/add', { name:'Cross origin',requestId:randomUUID() }, 'https://invalid.example')).status,403);
  const stolenTeacherCookie = student.cookies.get('ewj_teacher')!;
  assert.equal((await student.form('/switch', {})).headers.get('location'),'/');
  assert.equal((await student.fetch('/admin')).headers.get('location'),'/');
  replay.cookies.clear(); replay.cookies.set('ewj_teacher',stolenTeacherCookie); assert.equal((await replay.fetch('/admin')).headers.get('location'),'/');
  assert.equal((await store.db.select().from(teacherSessions)).filter(s=>s.revokedAt).length,1);
});
test('HTTP teacher adds once, rejects duplicate names, renames, archives and reactivates; no history lost', async () => {
  const b = await teacherBrowser();
  const requestId = randomUUID(), input = { requestId,name:'HTTP managed student',group:'Group Z' };
  const added = await b.form('/admin/students?/add',input); assert.equal(added.status,200); assert.match(await added.text(),/O‘quvchi qo‘shildi/);
  assert.equal((await b.form('/admin/students?/add',input)).status,200);
  const [s] = await findStudents(store.db,input.name); assert.ok(s);
  assert.equal((await b.form('/admin/students?/add',{ ...input,requestId:randomUUID() })).status,409);
  const entry = new Browser(); assert.equal((await entry.form('/',{ name:input.name })).headers.get('location'),'/home');
  const f = await fixture(store.db); const a = await startAttempt(store.db,s.id,f.lesson.id);
  await saveAnswer(store.db,s.id,a.id,{ questionId:f.question.id,response:'token',expectedRevision:0 }); await submitAttempt(store.db,s.id,a.id);
  const path = `/admin/students/${s.id}`;
  assert.equal((await b.form(path+'?/rename',{ name:'HTTP renamed student',group:'Renamed group' })).status,200);
  assert.match(await (await entry.fetch('/home')).text(),/HTTP renamed student/);
  assert.equal((await store.db.select().from(lessonAttempts).where(eq(lessonAttempts.studentId,s.id))).length,1);
  assert.equal((await b.form(path+'?/archive',{})).status,200);
  assert.equal((await store.db.select().from(studentSessions).where(eq(studentSessions.studentId,s.id))).length,0);
  assert.equal((await entry.fetch('/home')).headers.get('location'),'/');
  assert.equal((await entry.form('/',{ name:'HTTP renamed student' })).status,403);
  assert.match(await (await b.fetch('/admin/students?status=archived')).text(),/HTTP renamed student/);
  assert.equal((await b.form(path+'?/reactivate',{})).status,200);
  assert.equal((await entry.form('/',{ name:'HTTP renamed student' })).headers.get('location'),'/home');
  assert.equal((await b.form('/admin/students?/add',{ requestId:randomUUID(),name:process.env.TEACHER_ENTRY_NAME! })).status,400);
});
test('HTTP written review saves, amends and deduplicates while student endpoints hide grading keys and peer answers', async () => {
  const b = await teacherBrowser(), s = await createStudent(store.db,'HTTP writing fixture');
  const f = await fixture(store.db,{ manual:true,policy:{ mode:'score',minimumPercent:90 } });
  const a = await startAttempt(store.db,s.id,f.lesson.id);
  await saveAnswer(store.db,s.id,a.id,{ questionId:f.question.id,response:'Private written response',expectedRevision:0 }); await submitAttempt(store.db,s.id,a.id);
  const path = `/admin/attempts/${a.id}`;
  assert.match(await (await b.fetch('/admin/reviews')).text(),/Private written response/);
  const detail = await b.fetch(path); assert.equal(detail.status,200); assert.match(await detail.text(),/O‘qituvchi bahosi kutilmoqda/);
  const initial = { requestId:randomUUID(),questionId:f.question.id,expectedRevision:'0',points:'9',feedback:'Useful feedback' };
  assert.equal((await b.form(path+'?/review',initial)).status,200);
  assert.equal((await b.form(path+'?/review',initial)).status,200);
  assert.equal((await store.db.select().from(teacherReviews).where(eq(teacherReviews.attemptId,a.id))).length,1);
  assert.equal((await b.form(path+'?/review',{ ...initial,requestId:randomUUID(),expectedRevision:'1',points:'5' })).status,200);
  assert.equal((await store.db.select().from(lessonAttempts).where(eq(lessonAttempts.id,a.id)))[0].earnedPoints,5);
  const owner = new Browser(), peer = new Browser(); await owner.form('/',{ name:s.displayName }); await peer.form('/',{ name:'HTTP peer' });
  const dto = await (await owner.fetch(`/api/attempts/${a.id}`)).json();
  assert.equal(dto.answers[0].feedback,'Useful feedback'); assert.equal(dto.questions[0].grading,undefined); assert.equal(dto.answers[0].earnedPoints,5);
  assert.equal((await peer.fetch(`/api/attempts/${a.id}`)).status,404);
  assert.equal((await peer.fetch(path)).headers.get('location'),'/');
  const activity = (await store.db.select().from(students).where(eq(students.id,s.id)))[0].lastLearningAt;
  for (const p of ['/admin',path,`/admin/students/${s.id}`,'/admin/questions']) assert.equal((await b.fetch(p)).status,200);
  assert.deepEqual((await store.db.select().from(students).where(eq(students.id,s.id)))[0].lastLearningAt,activity);
});
test('HTTP database failures are recoverable errors, never invented empty results', async () => {
  const b=await teacherBrowser(); await store.pool.query('ALTER TABLE units RENAME TO unavailable_units');
  try { const result=await b.fetch('/admin/questions'); assert.equal(result.status,503); const html=await result.text(); assert.match(html,/Sahifani ochib bo‘lmadi/); assert.doesNotMatch(html,/Hali savollar bo‘yicha natija yo‘q/); }
  finally { await store.pool.query('ALTER TABLE unavailable_units RENAME TO units'); }
});

test('HTTP teacher coin controls add/subtract once and reject student or cross-origin mutations',async()=>{
 const teacher=await teacherBrowser(),s=await createStudent(store.db,'HTTP coin learner'),path=`/admin/students/${s.id}?/coins`;
 const request={requestId:randomUUID(),operation:'add',amount:'120',reason:'Class practice'};
 assert.equal((await teacher.form(path,request)).status,200);assert.equal((await teacher.form(path,request)).status,200);
 const {homeData}=await import('../src/lib/server/learning/catalog');assert.equal((await homeData(store.db,s.id)).totalPoints,120);
 assert.equal((await teacher.form(path,{...request,requestId:randomUUID(),operation:'subtract',amount:'150'})).status,200);
 assert.equal((await homeData(store.db,s.id)).totalPoints,-30);
 const student=new Browser();await student.form('/',{name:s.displayName});assert.equal((await student.form(path,{...request,requestId:randomUUID()})).headers.get('location'),'/');
 assert.equal((await teacher.form(path,{...request,requestId:randomUUID()},'https://another.invalid')).status,403);
 assert.equal((await homeData(store.db,s.id)).totalPoints,-30);
});
