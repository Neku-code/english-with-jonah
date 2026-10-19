import { after, before, test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { eq, and } from 'drizzle-orm';
import { testDatabase } from './database';
import { fixture, newRevision } from './fixtures';
import { createStudent, findStudents, archiveStudent, renameStudent } from '../src/lib/server/students';
import { resolveEntry, restoreSession, endSession, hashToken } from '../src/lib/server/sessions';
import { normalizeName, ServiceError } from '../src/lib/server/validation';
import { startAttempt, loadAttempt, saveAnswer, submitAttempt, recordVocabularyResult } from '../src/lib/server/learning/attempts';
import { homeData, publishedCatalog } from '../src/lib/server/learning/catalog';
import { answers, lessonAttempts, lessonProgress, lessonVersions, lessons, questions, studentSessions, students, vocabularyReadiness, vocabularyResults } from '../src/lib/server/db/schema';

let store: Awaited<ReturnType<typeof testDatabase>>;
before(async () => { store = await testDatabase(); });
after(async () => { await store?.close(); });
const fails = (promise: Promise<unknown>, code: string) => assert.rejects(promise, (e: unknown) => e instanceof ServiceError && e.code === code);

test('migrations are repeatable and insert no curriculum or students', async () => {
  assert.equal((await store.db.select().from(students)).length, 0);
  assert.deepEqual(await publishedCatalog(store.db), []);
});
test('controlled CLI registers, lists, renames and archives students against PostgreSQL', async () => {
  const run = (args: string[]) => promisify(execFile)(process.execPath, ['--import', 'tsx', 'scripts/students.ts', ...args], { env: { ...process.env, DATABASE_URL: store.url } });
  const added = await run(['add', '--name', 'CLI synthetic person', '--group', 'Synthetic group']);
  assert.match(added.stdout, /CLI synthetic person/);
  const student = (await findStudents(store.db, 'CLI synthetic person'))[0]; assert.ok(student);
  assert.match((await run(['list'])).stdout, /CLI synthetic person/);
  await run(['rename', '--id', student.id, '--name', 'CLI corrected person']);
  assert.equal((await findStudents(store.db, 'CLI corrected person'))[0].id, student.id);
  await run(['archive', '--id', student.id]);
  assert.equal((await findStudents(store.db, 'CLI corrected person')).length, 0);
});
test('name entry creates once, reopens exact normalized names, preserves display and reserves admin', async () => {
  const { db } = store;
  assert.equal(normalizeName('  G‘ulom   Oʻrinov '), "g'ulom o'rinov");
  const first = await resolveEntry(db, '  G‘ulom   O‘rinov  ');
  const a = first.student;
  assert.equal(a.displayName, 'G‘ulom O‘rinov');
  assert.equal((await findStudents(db, '  G`ULOM   OʼRINOV '))[0].id, a.id);
  assert.equal((await findStudents(db, 'Gulom Orinov')).length, 0);
  const reopened = await resolveEntry(db, 'GʻULOM OʻRINOV');
  assert.equal(reopened.student.id, a.id);
  assert.equal(reopened.student.displayName, a.displayName);
  const different = await resolveEntry(db, 'Gulom Orinov');
  assert.notEqual(different.student.id, a.id); // No fuzzy matching.
  await fails(resolveEntry(db, '  '), 'INVALID_NAME');
  await fails(createStudent(db, 'Jonah2009tdiu'), 'RESERVED_NAME');
  await fails(resolveEntry(db, ' jonah2009tdiu '), 'RESERVED_NAME');
  await fails(createStudent(db, "G'ulom O'rinov", 'B'), 'DUPLICATE_NAME');
  await fails(renameStudent(db, different.student.id, a.displayName), 'DUPLICATE_NAME');
  await assert.rejects(db.insert(students).values({ displayName: 'Direct duplicate', lookupName: normalizeName(a.displayName) }));
  await renameStudent(db, a.id, 'Renamed person', 'C');
  assert.equal((await restoreSession(db, first.token))?.displayName, 'Renamed person');
  assert.equal((await resolveEntry(db, 'renamed person')).student.id, a.id);
});

test('concurrent first visits share one profile and profile/session creation rolls back together', async () => {
  const { db, pool } = store;
  const entries = await Promise.all(['Concurrent person', ' concurrent   PERSON ', 'CONCURRENT PERSON'].map(name => resolveEntry(db, name)));
  assert.equal(new Set(entries.map(entry => entry.student.id)).size, 1);
  assert.equal((await findStudents(db, 'concurrent person')).length, 1);
  await pool.query("CREATE FUNCTION test_fail_session() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$; CREATE TRIGGER test_session_failure BEFORE INSERT ON student_sessions FOR EACH ROW EXECUTE FUNCTION test_fail_session()");
  try { await assert.rejects(resolveEntry(db, 'Rollback entry person')); }
  finally { await pool.query('DROP TRIGGER test_session_failure ON student_sessions; DROP FUNCTION test_fail_session()'); }
  assert.equal((await findStudents(db, 'Rollback entry person')).length, 0);
});
test('opaque remembered sessions, profile switching, expiry and archiving', async () => {
  const { db } = store;
  const student = await createStudent(db, 'Session person');
  const first = await resolveEntry(db, 'Session person');
  assert.equal(first.kind, 'session'); if (first.kind !== 'session') throw new Error('Expected session');
  assert.equal((await restoreSession(db, first.token))?.id, student.id);
  const [stored] = await db.select().from(studentSessions).where(eq(studentSessions.tokenHash, hashToken(first.token)));
  assert.notEqual(stored.tokenHash, first.token);
  await endSession(db, first.token); assert.equal(await restoreSession(db, first.token), null);
  await db.insert(studentSessions).values({ tokenHash: hashToken(first.token), studentId: student.id, createdAt: new Date(Date.now() - 120_000), expiresAt: new Date(Date.now() - 60_000) });
  assert.equal(await restoreSession(db, first.token), null);
  const next = await resolveEntry(db, 'Session person'); if (next.kind !== 'session') throw new Error('Expected session');
  await archiveStudent(db, student.id);
  assert.equal(await restoreSession(db, next.token), null);
  await fails(resolveEntry(db, 'Session person'), 'ARCHIVED_NAME');
  await fails(createStudent(db, 'Session person'), 'DUPLICATE_NAME');
  assert.equal((await db.select().from(students).where(eq(students.lookupName, 'session person'))).length, 1);
});
test('empty home, draft filtering and automatic future published catalog', async () => {
  const { db } = store;
  const student = await createStudent(db, 'Catalog person');
  const empty = await homeData(db, student.id);
  assert.equal(empty.lessonCount, 0); assert.equal(empty.primary, null); assert.deepEqual(empty.recent, []);
  await fixture(db, { published: false }); await fixture(db, { unitPublished: false });
  assert.equal((await homeData(db, student.id)).lessonCount, 0);
  const published = await fixture(db);
  const home = await homeData(db, student.id);
  assert.equal(home.lessonCount, 1); assert.equal(home.primary?.href, `/learn/${published.lesson.id}`);
  assert.equal(home.units.find(u => u.id === published.unit.id)?.points, 0);
  assert.ok(!JSON.stringify(home).includes('accepted'));
});
test('save/resume, student isolation, cross-version FK, stale saves and concurrent start', async () => {
  const { db } = store;
  const a = await createStudent(db, 'Attempt A'), b = await createStudent(db, 'Attempt B');
  const f = await fixture(db); const other = await fixture(db);
  const [one, two] = await Promise.all([startAttempt(db, a.id, f.lesson.id), startAttempt(db, a.id, f.lesson.id)]);
  assert.equal(one.id, two.id);
  // Before any answer exists, these fail because of ownership/revision FKs,
  // rather than merely colliding with the answer primary key.
  await assert.rejects(db.insert(answers).values({ attemptId: one.id, studentId: b.id, versionId: f.version.id, questionId: f.question.id, response: 'x' }));
  await assert.rejects(db.insert(answers).values({ attemptId: one.id, studentId: a.id, versionId: f.version.id, questionId: other.question.id, response: 'x' }));
  await saveAnswer(db, a.id, one.id, { questionId: f.question.id, response: ' token ', expectedRevision: 0 });
  assert.equal((await loadAttempt(db, a.id, one.id)).answers[0].response, ' token ');
  assert.equal((await startAttempt(db, a.id, f.lesson.id)).id, one.id);
  await fails(loadAttempt(db, b.id, one.id), 'ATTEMPT_NOT_FOUND');
  await fails(saveAnswer(db, b.id, one.id, { questionId: f.question.id, response: 'x', expectedRevision: 1 }), 'ATTEMPT_NOT_FOUND');
  await fails(submitAttempt(db, b.id, one.id), 'ATTEMPT_NOT_FOUND');
  await fails(saveAnswer(db, a.id, one.id, { questionId: other.question.id, response: 'x', expectedRevision: 0 }), 'QUESTION_NOT_FOUND');
  const simultaneous = await Promise.allSettled([
    saveAnswer(db, a.id, one.id, { questionId: f.question.id, response: 'new-a', expectedRevision: 1 }),
    saveAnswer(db, a.id, one.id, { questionId: f.question.id, response: 'new-b', expectedRevision: 1 })]);
  assert.equal(simultaneous.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(simultaneous.filter(r => r.status === 'rejected' && r.reason.code === 'STALE_ANSWER').length, 1);
  const resumed = await loadAttempt(db, a.id, one.id);
  assert.equal(resumed.answers[0].revision, 2);
  assert.ok(!JSON.stringify(resumed).includes('accepted'));
  assert.ok((await homeData(db, a.id)).primary?.href.includes(one.id));
  assert.deepEqual((await homeData(db, b.id)).recent, []);
});
test('transactional objective scoring, repeated submission, history and immutable content', async () => {
  const { db } = store;
  const a = await createStudent(db, 'Scoring person'); const f = await fixture(db);
  const attempt = await startAttempt(db, a.id, f.lesson.id);
  await saveAnswer(db, a.id, attempt.id, { questionId: f.question.id, response: 'TOKEN', expectedRevision: 0 });
  await newRevision(db, f.lesson.id);
  await assert.rejects(db.update(questions).set({ maxPoints: 99 }).where(eq(questions.id, f.question.id)));
  await assert.rejects(db.update(lessonVersions).set({ title: 'Changed' }).where(eq(lessonVersions.id, f.version.id)));
  await assert.rejects(db.insert(questions).values({ versionId: f.version.id, exerciseType: 'written', content: { prompt: 'x' }, grading: { mode: 'manual' }, maxPoints: 1, position: 2 }));
  const [result, repeated] = await Promise.all([submitAttempt(db, a.id, attempt.id), submitAttempt(db, a.id, attempt.id)]);
  assert.deepEqual(result, repeated); assert.equal(result.earnedPoints, 10); assert.equal(result.maxPoints, 10);
  assert.equal((await db.select().from(lessonProgress).where(eq(lessonProgress.studentId, a.id))).length, 1);
  await fails(saveAnswer(db, a.id, attempt.id, { questionId: f.question.id, response: 'wrong', expectedRevision: 1 }), 'ALREADY_SUBMITTED');
  await assert.rejects(db.update(answers).set({ response: 'direct edit' }).where(eq(answers.attemptId, attempt.id)));
  const fresh = await startAttempt(db, a.id, f.lesson.id); assert.notEqual(fresh.id, attempt.id);
  assert.notEqual((await loadAttempt(db, a.id, fresh.id)).versionId, f.version.id);
  await submitAttempt(db, a.id, fresh.id);
  assert.equal((await db.select().from(lessonProgress).where(eq(lessonProgress.studentId, a.id))).length, 1);
});
test('written work is pending review, manual policies do not complete, rollback is atomic', async () => {
  const { db, pool } = store;
  const a = await createStudent(db, 'Review person');
  const f = await fixture(db, { manual: true, policy: { mode: 'all_answered' } });
  const attempt = await startAttempt(db, a.id, f.lesson.id);
  await saveAnswer(db, a.id, attempt.id, { questionId: f.question.id, response: 'ungraded writing', expectedRevision: 0 });
  const result = await submitAttempt(db, a.id, attempt.id); assert.equal(result.pendingReview, true);
  assert.equal((await loadAttempt(db, a.id, attempt.id)).answers[0].reviewStatus, 'pending');
  assert.equal((await db.select().from(lessonProgress).where(eq(lessonProgress.studentId, a.id))).length, 0);
  const manual = await fixture(db, { policy: { mode: 'manual' } });
  const m = await startAttempt(db, a.id, manual.lesson.id); await saveAnswer(db, a.id, m.id, { questionId: manual.question.id, response: 'token', expectedRevision: 0 }); await submitAttempt(db, a.id, m.id);
  assert.equal((await db.select().from(lessonProgress).where(eq(lessonProgress.studentId, a.id))).length, 0);
  const fail = await fixture(db); const x = await startAttempt(db, a.id, fail.lesson.id);
  await saveAnswer(db, a.id, x.id, { questionId: fail.question.id, response: 'token', expectedRevision: 0 });
  await pool.query("CREATE FUNCTION test_fail_progress() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$; CREATE TRIGGER test_failure BEFORE INSERT ON lesson_progress FOR EACH ROW EXECUTE FUNCTION test_fail_progress()");
  try { await assert.rejects(submitAttempt(db, a.id, x.id)); } finally { await pool.query('DROP TRIGGER test_failure ON lesson_progress; DROP FUNCTION test_fail_progress()'); }
  const rolled = await loadAttempt(db, a.id, x.id);
  assert.equal(rolled.status, 'in_progress'); assert.equal(rolled.answers[0].reviewStatus, 'ungraded');
  assert.equal((await submitAttempt(db, a.id, x.id)).earnedPoints, 10);
});
test('vocabulary readiness is lesson/revision-specific, 75% and monotonic', async () => {
  const { db } = store; const a = await createStudent(db, 'Vocabulary person');
  const f = await fixture(db, { vocabulary: true }), other = await fixture(db, { vocabulary: true });
  await fails(startAttempt(db, a.id, f.lesson.id), 'VOCABULARY_REQUIRED');
  assert.equal((await recordVocabularyResult(db, a.id, f.lesson.id, f.version.id, 'low', 2, 4)).passed, false);
  await assert.rejects(db.update(vocabularyResults).set({ correct: 4 }).where(eq(vocabularyResults.studentId, a.id)));
  await fails(startAttempt(db, a.id, f.lesson.id), 'VOCABULARY_REQUIRED');
  assert.equal((await recordVocabularyResult(db, a.id, f.lesson.id, f.version.id, 'pass', 3, 4)).passed, true);
  await recordVocabularyResult(db, a.id, f.lesson.id, f.version.id, 'pass', 3, 4);
  await fails(recordVocabularyResult(db, a.id, f.lesson.id, f.version.id, 'pass', 4, 4), 'RESULT_CONFLICT');
  await recordVocabularyResult(db, a.id, f.lesson.id, f.version.id, 'later-fail', 0, 4);
  assert.equal((await db.select().from(vocabularyReadiness).where(and(eq(vocabularyReadiness.studentId, a.id), eq(vocabularyReadiness.versionId, f.version.id)))).length, 1);
  assert.ok(await startAttempt(db, a.id, f.lesson.id));
  await fails(startAttempt(db, a.id, other.lesson.id), 'VOCABULARY_REQUIRED');
  assert.equal((await db.select().from(lessonProgress).where(eq(lessonProgress.studentId, a.id))).length, 0);
});
test('final exam remains distinct from lesson completion; 90% mastery persists after failure', async () => {
  const { db } = store; const a = await createStudent(db, 'Mastery person');
  const f = await fixture(db); const exam = await fixture(db, { unitId: f.unit.id, kind: 'final_exam', published: false });
  await db.update(questions).set({ maxPoints: 899 }).where(eq(questions.id, exam.question.id));
  const [boundary] = await db.insert(questions).values({ versionId: exam.version.id, exerciseType: 'text', content: { prompt: 'Synthetic boundary token' }, grading: exam.question.grading, maxPoints: 1, position: 2 }).returning();
  await db.insert(questions).values({ versionId: exam.version.id, exerciseType: 'text', content: { prompt: 'Synthetic remaining token' }, grading: exam.question.grading, maxPoints: 100, position: 3 });
  await db.update(lessons).set({ status: 'published' }).where(eq(lessons.id, exam.lesson.id));
  await db.update(lessonVersions).set({ publishedAt: new Date() }).where(eq(lessonVersions.id, exam.version.id));
  await fails(startAttempt(db, a.id, exam.lesson.id), 'LESSONS_REQUIRED');
  const lesson = await startAttempt(db, a.id, f.lesson.id); await saveAnswer(db, a.id, lesson.id, { questionId: f.question.id, response: 'token', expectedRevision: 0 }); await submitAttempt(db, a.id, lesson.id);
  const before = (await homeData(db, a.id)).units.find(u => u.id === f.unit.id)!; assert.equal(before.points, 50);
  const below = await startAttempt(db, a.id, exam.lesson.id); await saveAnswer(db, a.id, below.id, { questionId: exam.question.id, response: 'token', expectedRevision: 0 }); await submitAttempt(db, a.id, below.id);
  assert.equal((await homeData(db, a.id)).units.find(u => u.id === f.unit.id)?.points, 50); // 89.9% must not round to mastery.
  const success = await startAttempt(db, a.id, exam.lesson.id);
  await saveAnswer(db, a.id, success.id, { questionId: exam.question.id, response: 'token', expectedRevision: 0 });
  await saveAnswer(db, a.id, success.id, { questionId: boundary.id, response: 'token', expectedRevision: 0 });
  assert.equal((await submitAttempt(db, a.id, success.id)).earnedPoints, 900); // Exactly 90%.
  assert.equal((await homeData(db, a.id)).units.find(u => u.id === f.unit.id)?.points, 100);
  const failure = await startAttempt(db, a.id, exam.lesson.id); await submitAttempt(db, a.id, failure.id);
  const home = await homeData(db, a.id); assert.equal(home.units.find(u => u.id === f.unit.id)?.points, 100); assert.equal(home.units.find(u => u.id === f.unit.id)?.mastered, true);
});
