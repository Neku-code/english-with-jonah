import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { parse } from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { databaseUrl } from './database.mjs';
import { connectDatabase } from '../src/lib/server/db/connect';
import { createStudent, renameStudent, archiveStudent, reactivateStudent, findStudents } from '../src/lib/server/students';
import { createTeacherSession, endTeacherSession } from '../src/lib/server/teacher-sessions';
import { startAttempt, saveAnswer, submitAttempt, loadAttempt } from '../src/lib/server/learning/attempts';
import { saveReview } from '../src/lib/server/admin/reviews';
import { questionPerformance, overview } from '../src/lib/server/admin/data';
import { teacherReviews, answers, units } from '../src/lib/server/db/schema';
import { fixture } from '../tests/fixtures';

let connection: ReturnType<typeof connectDatabase> | undefined;
try {
  assert.ok(process.env.NEON_BRANCH?.startsWith('codex-box6-verify-'), 'Requires an isolated Box 6 verification branch.');
  const privateEnv = parse(readFileSync(existsSync('.env.local') ? '.env.local' : '.env'));
  const endpoint = (value: string) => new URL(value).hostname.replace('-pooler.', '.');
  const url = databaseUrl(); assert.notEqual(endpoint(url), endpoint(privateEnv.DATABASE_URL));
  connection = connectDatabase(url); const db = connection.db;
  const s = await createStudent(db, `Isolated Box6 ${randomUUID()}`), teacher = await createTeacherSession(db);
  const { rows: positions } = await db.execute<{ next: number }>(sql`SELECT COALESCE(max(position),0)+1 AS next FROM units`);
  const [unit] = await db.insert(units).values({ title: 'Isolated verification unit', position: positions[0].next, status: 'published' }).returning();
  const f = await fixture(db, { unitId: unit.id, manual: true, policy: { mode: 'score', minimumPercent: 90 } });
  const a = await startAttempt(db, s.id, f.lesson.id);
  await saveAnswer(db, s.id, a.id, { questionId: f.question.id, response: 'Isolated review verification', expectedRevision: 0 });
  await submitAttempt(db, s.id, a.id); assert.equal((await loadAttempt(db, s.id, a.id)).pendingReview, true);
  const input = { requestId: randomUUID(), expectedRevision: '0', feedback: 'Isolated teacher review', points: '9' };
  await saveReview(db, teacher.id, a.id, f.question.id, input); await saveReview(db, teacher.id, a.id, f.question.id, input);
  assert.equal((await db.select().from(teacherReviews).where(eq(teacherReviews.attemptId, a.id))).length, 1);
  assert.equal((await loadAttempt(db, s.id, a.id)).earnedPoints, 9);
  assert.equal((await db.select().from(answers).where(eq(answers.attemptId, a.id)))[0].reviewStatus, 'pending');
  await saveReview(db, teacher.id, a.id, f.question.id, { ...input, requestId: randomUUID(), expectedRevision: '1', points: '10' });
  assert.equal((await loadAttempt(db, s.id, a.id)).earnedPoints, 10);
  const stats = await questionPerformance(db, new URL(`http://localhost/admin/questions?lesson=${f.lesson.id}`));
  assert.equal(stats.rows[0].correct, 1); assert.equal(stats.rows[0].pending, 0);
  await renameStudent(db, s.id, s.displayName + ' renamed'); await archiveStudent(db, s.id);
  assert.equal((await findStudents(db, s.displayName + ' renamed')).length, 0);
  await reactivateStudent(db, s.id); assert.equal((await findStudents(db, s.displayName + ' renamed'))[0].id, s.id);
  assert.ok((await overview(db)).submitted > 0);
  await endTeacherSession(db, teacher.token);
  console.log('PASS isolated Neon: lifecycle, immutable responses, idempotent review, score amendments, progress and question statistics.');
} catch (e) {
  console.error(e instanceof assert.AssertionError ? 'FAIL isolated Neon verification assertion.' : 'FAIL isolated Neon verification; inspect private configuration.');
  process.exitCode = 1;
} finally { await connection?.pool.end(); }
