import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { parse } from 'dotenv';
import { eq } from 'drizzle-orm';
import { databaseUrl } from './database.mjs';
import { connectDatabase } from '../src/lib/server/db/connect';
import { findStudents } from '../src/lib/server/students';
import { lessonProgress, units } from '../src/lib/server/db/schema';
import { fixture } from '../tests/fixtures';

// Explicit opt-in only. Never runs against the production branch/endpoint.
// Example: node --env-file=.artifacts/neon-verify.env --import tsx scripts/verify-neon.ts
let app: ChildProcess | undefined;
let connection: ReturnType<typeof connectDatabase> | undefined;
let step = 'verification safety checks';
try {
  assert.ok(process.env.NEON_BRANCH?.startsWith('codex-setup-verify-'), 'Use a disposable codex-setup-verify-* Neon branch.');
  const url = databaseUrl();
  const productionEnv = parse(readFileSync(existsSync('.env.local') ? '.env.local' : '.env'));
  const endpoint = (value: string) => new URL(value).hostname.replace('-pooler.', '.');
  assert.notEqual(endpoint(url), endpoint(productionEnv.DATABASE_URL), 'Verification must not use the production endpoint.');
  connection = connectDatabase(url);
  const db = connection.db;
  assert.equal((await db.select().from(units)).length, 0, 'Use a fresh verification branch without curriculum.');
  const probe = createServer(); await new Promise<void>(done => probe.listen(0, '127.0.0.1', done));
  const port = (probe.address() as { port: number }).port; await new Promise<void>(done => probe.close(() => done()));
  const base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    env: { ...process.env, DATABASE_URL: url }, stdio: 'ignore', windowsHide: true
  });
  step = 'starting the application';
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    try { if ((await fetch(base + '/api/health')).ok) { ready = true; break; } } catch { /* startup */ }
    if (app.exitCode !== null) throw new Error('Application exited');
    await delay(200);
  }
  assert.ok(ready);
  console.log(`PASS app started: ${base}`);
  class Browser {
    cookies = new Map<string, string>();
    async request(path: string, init: RequestInit = {}) {
      const headers = new Headers(init.headers);
      if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
      const response = await fetch(base + path, { ...init, headers, redirect: 'manual' });
      for (const cookie of response.headers.getSetCookie()) {
        const [key, value] = cookie.split(';')[0].split('=');
        if (value) this.cookies.set(key, value); else this.cookies.delete(key);
      }
      return response;
    }
    form(path: string, body: Record<string, string>) { return this.request(path, { method: 'POST', headers: { origin: base, accept: 'text/html' }, body: new URLSearchParams(body) }); }
    json(path: string, body: unknown = {}, method = 'POST') { return this.request(path, { method, headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  }
  const browser = new Browser();
  const name = `Neon ulanish sinovi ${Date.now()}`;
  step = 'automatic name entry and PostgreSQL sessions';
  const login = await browser.form('/', { name });
  assert.equal(login.status, 303);
  const student = (await findStudents(db, name))[0]; assert.ok(student);
  assert.match(login.headers.getSetCookie().find(c => c.startsWith('ewj_session='))!, /HttpOnly/i);
  const empty = await (await browser.request('/home')).text();
  assert.match(empty, /Darslar hali qo‘shilmagan/);
  assert.equal((await browser.request('/')).headers.get('location'), '/home');
  console.log('PASS new-name profile creation, HttpOnly session, remembered profile and empty home');
  step = 'same-name access and different-name isolation';
  const returning = new Browser();
  assert.equal((await returning.form('/', { name: `  ${name.toUpperCase().replaceAll(' ', '   ')}  ` })).status, 303);
  assert.equal((await findStudents(db, name)).length, 1);
  const second = new Browser();
  assert.equal((await second.form('/', { name: `${name} boshqa` })).status, 303);
  step = 'published catalog and real attempt persistence';
  const objective = await fixture(db);
  const manual = await fixture(db, { manual: true, policy: { mode: 'all_answered' } });
  const start = await browser.json(`/api/lessons/${objective.lesson.id}/attempts`); assert.equal(start.status, 200);
  const attempt = await start.json();
  const path = `/api/attempts/${attempt.id}`;
  assert.equal((await second.request(path)).status, 404);
  const saved = await browser.json(`${path}/answers`, { questionId: objective.question.id, response: 'token', expectedRevision: 0 }, 'PUT');
  assert.equal(saved.status, 200);
  assert.equal((await browser.json(`${path}/answers`, { questionId: objective.question.id, response: 'stale', expectedRevision: 0 }, 'PUT')).status, 409);
  const restored = await (await browser.request(path)).json(); assert.equal(restored.answers[0].response, 'token');
  const sameNameSaved = await (await returning.request(path)).json(); assert.equal(sameNameSaved.answers[0].response, 'token');
  assert.equal(restored.answers[0].revision, 1); assert.ok(!JSON.stringify(restored).includes('accepted'));
  assert.equal((await browser.json(`/api/lessons/${objective.lesson.id}/attempts`)).status, 200);
  assert.match(await (await browser.request('/home')).text(), /Davom ettirish/);
  console.log('PASS same-name saved answers, published catalog, start/resume, stale-save rejection and different-name isolation');
  step = 'submission, scoring and progress';
  const first = await (await browser.json(`${path}/submit`)).json();
  const repeated = await (await browser.json(`${path}/submit`)).json();
  assert.deepEqual(first, repeated); assert.equal(first.earnedPoints, 10); assert.equal(first.maxPoints, 10);
  assert.equal((await db.select().from(lessonProgress).where(eq(lessonProgress.studentId, student.id))).length, 1);
  const writing = await (await browser.json(`/api/lessons/${manual.lesson.id}/attempts`)).json();
  assert.equal((await browser.json(`/api/attempts/${writing.id}/answers`, { questionId: manual.question.id, response: 'Synthetic written response', expectedRevision: 0 }, 'PUT')).status, 200);
  const reviewed = await (await browser.json(`/api/attempts/${writing.id}/submit`)).json(); assert.equal(reviewed.pendingReview, true);
  console.log('PASS objective scoring, idempotent submission, persisted progress and pending teacher review');
  step = 'profile switching';
  assert.equal((await browser.form('/switch', {})).status, 303);
  assert.equal((await browser.request('/home')).headers.get('location'), '/');
  console.log('PASS profile switching revokes the server-backed session');
  console.log(`PASS Neon PostgreSQL end-to-end verification (${process.env.NEON_BRANCH})`);
} catch (e) {
  // Keep URLs, cookies and driver details out of proof logs.
  console.error(`FAIL ${step}: ${e instanceof assert.AssertionError ? e.message : 'check failed; inspect private configuration and service availability'}`);
  process.exitCode = 1;
} finally {
  if (app && app.exitCode === null) {
    const done = new Promise<void>(resolve => app!.once('exit', () => resolve())); app.kill(); await done;
  }
  await connection?.pool.end();
}
