import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq } from 'drizzle-orm';
import { testDatabase } from './database';
import { fixture, newRevision } from './fixtures';
import { createStudent, archiveStudent, reactivateStudent } from '../src/lib/server/students';
import { startAttempt, saveAnswer, submitAttempt, recordVocabularyResult } from '../src/lib/server/learning/attempts';
import { vocabularyAction } from '../src/lib/server/learning/study';
import { homeData } from '../src/lib/server/learning/catalog';
import { awardLearningCoins, rankings } from '../src/lib/server/learning/rewards';
import { learningRewards, vocabularyStudy, vocabularyItems, lessonVersions, lessons } from '../src/lib/server/db/schema';

let store: Awaited<ReturnType<typeof testDatabase>>;
before(async () => { store = await testDatabase(); });
after(async () => { await store?.close(); });
const total = async (id: string) => (await homeData(store.db, id)).totalPoints;
async function finish(id: string, f: Awaited<ReturnType<typeof fixture>>) {
 const a = await startAttempt(store.db, id, f.lesson.id);
 await saveAnswer(store.db, id, a.id, { questionId: f.question.id, response: 'token', expectedRevision: 0 });
 await submitAttempt(store.db, id, a.id); return a;
}

test('review unlocks only its student/revision; it gives no mastery or coins', async () => {
 const { db } = store, s = await createStudent(db, 'Review unlock student'), other = await createStudent(db, 'Still locked student');
 const f = await fixture(db, { vocabulary: true });
 await assert.rejects(startAttempt(db, s.id, f.lesson.id), { code: 'VOCABULARY_REQUIRED' });
 await Promise.all([1,2].map(() => vocabularyAction(db, s.id, f.lesson.id, { action: 'review' })));
 assert.equal((await db.select().from(vocabularyStudy).where(eq(vocabularyStudy.studentId, s.id))).length, 1);
 const lesson = (await homeData(db, s.id)).units.find(u => u.id === f.unit.id)!.lessons[0];
 assert.equal(lesson.needsVocabulary, false); assert.equal(lesson.vocabularyMastered, false); assert.equal(await total(s.id), 0);
 await assert.rejects(startAttempt(db, other.id, f.lesson.id), { code: 'VOCABULARY_REQUIRED' });
 await finish(s.id, f); assert.equal(await total(s.id), 50);
 await newRevision(db, f.lesson.id, undefined, true);
 await assert.rejects(startAttempt(db, s.id, f.lesson.id), { code: 'VOCABULARY_REQUIRED' });
 await vocabularyAction(db, s.id, f.lesson.id, { action: 'review' });
 assert(await startAttempt(db, s.id, f.lesson.id));
 assert.equal((await db.select().from(learningRewards).where(eq(learningRewards.studentId, s.id))).length, 1);
 await assert.rejects(vocabularyAction(db, s.id, f.lesson.id, { action: 'invented' }), { code: 'INVALID_ACTION' });
});

test('typed vocabulary test awards 30 once, survives failure and cannot be submitted by another student', async () => {
 const { db } = store, s = await createStudent(db, 'Typed vocabulary student'), other = await createStudent(db, 'Other vocabulary student');
 const f = await fixture(db, { published: false, vocabulary: true });
 await db.insert(vocabularyItems).values([1,2,3,4].map(position => ({ versionId: f.version.id, position, english: 'synthetic '+position, acceptedTranslations: ['sinov'] })));
 await db.update(lessons).set({ status: 'published' }).where(eq(lessons.id, f.lesson.id));
 await db.update(lessonVersions).set({ publishedAt: new Date() }).where(eq(lessonVersions.id, f.version.id));
 await vocabularyAction(db, s.id, f.lesson.id, { action: 'review' });
 const session = await vocabularyAction(db, s.id, f.lesson.id, { action: 'start' }) as { id: string; words: { id: string }[] };
 assert.equal(session.words.length, 2);
 await assert.rejects(vocabularyAction(db, other.id, f.lesson.id, { action: 'answer', sessionId: session.id, wordId: session.words[0].id, response: 'sinov' }), { code: 'VOCAB_NOT_FOUND' });
 for (const [i,w] of session.words.entries()) {
  const results = await Promise.all([1,2].map(() => vocabularyAction(db, s.id, f.lesson.id, { action: 'answer', sessionId: session.id, wordId: w.id, response: 'sinov' })));
  assert.equal(results.reduce((sum,r) => sum+('coinsAwarded' in r ? (r.coinsAwarded ?? 0) : 0), 0), i===1 ? 30 : 0);
 }
 assert.equal(await total(s.id), 30);
 await recordVocabularyResult(db, s.id, f.lesson.id, f.version.id, 'another-pass', 3, 4);
 await recordVocabularyResult(db, s.id, f.lesson.id, f.version.id, 'later-failure', 0, 4);
 assert.equal(await total(s.id), 30);
 assert.equal((await homeData(db,s.id)).units.find(u=>u.id===f.unit.id)!.lessons[0].vocabularyMastered, true);
 assert.equal(await total(other.id), 0);
});

test('lesson and final mastery receipts are atomic, repeat-safe, stable across revisions and retained after failure', async () => {
 const { db, pool } = store, s = await createStudent(db, 'Reward lifecycle student');
 const f = await fixture(db), second = await fixture(db, { unitId: f.unit.id });
 const exam = await fixture(db, { unitId: f.unit.id, kind: 'final_exam' });
 await finish(s.id, f); assert.equal(await total(s.id), 50);
 await finish(s.id, f); assert.equal(await total(s.id), 50);
 const a = await startAttempt(db, s.id, second.lesson.id);
 await saveAnswer(db, s.id, a.id, { questionId: second.question.id, response: 'token', expectedRevision: 0 });
 await pool.query("CREATE FUNCTION fail_reward() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'reward rollback'; END $$; CREATE TRIGGER fail_reward BEFORE INSERT ON learning_rewards FOR EACH ROW EXECUTE FUNCTION fail_reward()");
 try { await assert.rejects(submitAttempt(db, s.id, a.id)); }
 finally { await pool.query('DROP TRIGGER fail_reward ON learning_rewards; DROP FUNCTION fail_reward()'); }
 assert.equal(await total(s.id), 50);
 await Promise.all([submitAttempt(db, s.id, a.id),submitAttempt(db, s.id, a.id)]); assert.equal(await total(s.id), 100);
 const failed = await startAttempt(db, s.id, exam.lesson.id); await submitAttempt(db, s.id, failed.id); assert.equal(await total(s.id),100);
 await finish(s.id, exam); assert.equal(await total(s.id), 120);
 await finish(s.id, exam); assert.equal(await total(s.id), 120);
 const later = await startAttempt(db,s.id,exam.lesson.id);await submitAttempt(db,s.id,later.id);
 const unit=(await homeData(db,s.id)).units.find(u=>u.id===f.unit.id)!;
 assert.equal(unit.mastered,true);assert(unit.lessons.filter(l=>l.kind==='lesson').every(l=>l.mastered));
 const revision=await newRevision(db, f.lesson.id, f.question.grading); await finish(s.id, {...f,...revision}); assert.equal(await total(s.id), 120);
 assert.equal(await awardLearningCoins(db, s.id), 0);
 const receipt = and(eq(learningRewards.studentId,s.id),eq(learningRewards.lessonId,f.lesson.id));
 await assert.rejects(db.update(learningRewards).set({coins:50}).where(receipt));
 await assert.rejects(db.delete(learningRewards).where(receipt));
});

test('rankings use real lifetime coins, share tied ranks, exclude archived students and expose only display data', async () => {
 const { db } = store, a=await createStudent(db,'Ranking Alpha'), b=await createStudent(db,'Ranking Beta');
 const f=await fixture(db);await finish(a.id,f);await finish(b.id,f);
 let rows=await rankings(db,a.id),ra=rows.find(r=>r.isCurrent)!,rb=rows.find(r=>r.name===b.displayName)!;
 assert.equal(ra.points,50);assert.equal(ra.rank,rb.rank);assert.deepEqual(Object.keys(ra).sort(),['isCurrent','name','points','rank']);
 assert(rows.every((r,i)=>!i||BigInt(rows[i-1].points)>=BigInt(r.points)));
 await archiveStudent(db,b.id);rows=await rankings(db,a.id);assert(!rows.some(r=>r.name===b.displayName));
 await reactivateStudent(db,b.id);assert.equal((await rankings(db,a.id)).find(r=>r.name===b.displayName)!.points,50);
});
