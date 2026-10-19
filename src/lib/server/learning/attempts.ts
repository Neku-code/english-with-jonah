import { and, eq, sql } from 'drizzle-orm';
import type { Database, Connection } from '../db/connect';
import { answers, lessonAttempts, lessonProgress, lessons, lessonVersions, questions, students, vocabularyReadiness, vocabularyStudy, vocabularyResults, studyWorkspaces, practiceChecks } from '../db/schema';
import { lockStudent } from '../students';
import { reject, responseText, uuid } from '../validation';
import { publishedCatalog } from './catalog';
import { grade, isCompleted, validatePolicy, validateQuestion } from './grading';
import type { AttemptResult } from './contracts';
import { answered, responseParts } from './authored-grading';
import { awardLearningCoins } from './rewards';

const result = (a: typeof lessonAttempts.$inferSelect): AttemptResult => ({ id: a.id, status: a.status, earnedPoints: a.earnedPoints, maxPoints: a.maxPoints, pendingReview: a.pendingReview });
async function touch(tx: Connection, studentId: string) { await tx.update(students).set({ lastLearningAt: new Date() }).where(eq(students.id, studentId)); }
export async function ownedAttempt(tx: Connection, studentId: string, attemptId: string) {
  const [attempt] = await tx.select().from(lessonAttempts).where(and(eq(lessonAttempts.id, uuid(attemptId)), eq(lessonAttempts.studentId, studentId))).for('update');
  return attempt ?? reject(404, 'ATTEMPT_NOT_FOUND', 'Urinish topilmadi.');
}
export async function available(tx: Connection, lessonId: string) {
  const catalog = await publishedCatalog(tx);
  const unit = catalog.find(u => u.lessons.some(l => l.id === lessonId));
  const lesson = unit?.lessons.find(l => l.id === lessonId);
  if (!lesson || !unit) return reject(404, 'LESSON_NOT_FOUND', 'Dars hozir mavjud emas.');
  return { lesson, unit };
}
export async function startAttempt(db: Database, studentId: string, lessonId: string) {
  uuid(lessonId);
  return db.transaction(async tx => {
    await lockStudent(tx, studentId); // Serializes this student's start/save/submit/archive operations.
    const { lesson, unit } = await available(tx, lessonId);
    const [existing] = await tx.select().from(lessonAttempts).where(and(eq(lessonAttempts.studentId, studentId), eq(lessonAttempts.lessonId, lessonId), eq(lessonAttempts.status, 'in_progress')));
    if (existing) { await touch(tx, studentId); return result(existing); }
    if (lesson.vocabularyRequired) {
      const [ready] = await tx.select().from(vocabularyReadiness).where(and(eq(vocabularyReadiness.studentId, studentId), eq(vocabularyReadiness.lessonId, lessonId), eq(vocabularyReadiness.versionId, lesson.versionId)));
      const [reviewed] = await tx.select().from(vocabularyStudy).where(and(eq(vocabularyStudy.studentId, studentId), eq(vocabularyStudy.versionId, lesson.versionId)));
      if (!ready && !reviewed) return reject(409, 'VOCABULARY_REQUIRED', 'Avval shu darsning lug‘atini ko‘rib chiqing.');
    }
    if (lesson.kind === 'final_exam') {
      const completed = await tx.select().from(lessonProgress).where(eq(lessonProgress.studentId, studentId));
      const ids = new Set(completed.map(p => p.lessonId));
      const regular = unit.lessons.filter(l => l.kind === 'lesson');
      if (!regular.length || regular.some(l => !ids.has(l.id))) return reject(409, 'LESSONS_REQUIRED', 'Avval bo‘lim darslarini tugating.');
    }
    const [version] = await tx.select().from(lessonVersions).where(eq(lessonVersions.id, lesson.versionId));
    const qs = await tx.select().from(questions).where(eq(questions.versionId, lesson.versionId));
    if (!qs.length) return reject(409, 'CONTENT_NOT_READY', 'Dars hali tayyor emas.');
    validatePolicy(version.completionPolicy); qs.forEach(validateQuestion);
    const [attempt] = await tx.insert(lessonAttempts).values({ studentId, lessonId, versionId: lesson.versionId }).returning();
    await touch(tx, studentId);
    return result(attempt);
  });
}
export async function loadAttempt(db: Database, studentId: string, attemptId: string) {
  return db.transaction(async tx => {
    await lockStudent(tx, studentId);
    const attempt = await ownedAttempt(tx, studentId, attemptId);
    await available(tx, attempt.lessonId);
    const qs = await tx.select({ id: questions.id, exerciseType: questions.exerciseType, content: questions.content, grading:questions.grading, maxPoints: questions.maxPoints, position: questions.position })
      .from(questions).where(eq(questions.versionId, attempt.versionId)).orderBy(questions.position);
    const { rows: saved } = await tx.execute<{ questionId: string; response: string; revision: number; earnedPoints: number | null; reviewStatus: string; feedback: string | null }>(sql`
      SELECT question_id AS "questionId",response #>> '{}' response,revision,effective_points AS "earnedPoints",effective_status AS "reviewStatus",feedback
      FROM effective_answers WHERE attempt_id=${attempt.id} AND student_id=${studentId}`);
    const [workspace] = await tx.select().from(studyWorkspaces).where(eq(studyWorkspaces.attemptId,attempt.id));
    const checks = await tx.select().from(practiceChecks).where(eq(practiceChecks.attemptId,attempt.id)).orderBy(practiceChecks.createdAt);
    const [lesson] = await tx.select().from(lessons).where(eq(lessons.id,attempt.lessonId));
    return { ...result(attempt), lessonId: attempt.lessonId, versionId: attempt.versionId, workspace:workspace ?? null,
      questions: qs.map(q => ({ id:q.id,exerciseType:q.exerciseType,maxPoints:q.maxPoints,position:q.position, content: { prompt: q.content.prompt, ...(q.content.task ? {task:q.content.task}:{}), ...(q.content.options ? { options: q.content.options.map(o => ({ id: o.id, label: o.label })) } : {}) },
        feedback:attempt.status==='submitted' && 'feedback' in q.grading ? q.grading.feedback:null })), answers: saved,
      checks:lesson.kind==='final_exam' ? [] : checks.map(c=>({...c,feedback:qs.find(q=>q.id===c.questionId)?.grading && 'feedback' in qs.find(q=>q.id===c.questionId)!.grading ? (qs.find(q=>q.id===c.questionId)!.grading as {feedback:string}).feedback : ''})) };
  });
}
export async function saveAnswer(db: Database, studentId: string, attemptId: string, input: { questionId: unknown; response: unknown; expectedRevision: unknown }) {
  const questionId = uuid(input.questionId); const response = responseText(input.response);
  if (!Number.isSafeInteger(input.expectedRevision) || (input.expectedRevision as number) < 0) return reject(400, 'INVALID_REVISION', 'Javob versiyasi noto‘g‘ri.');
  return db.transaction(async tx => {
    await lockStudent(tx, studentId);
    const attempt = await ownedAttempt(tx, studentId, attemptId);
    if (attempt.status !== 'in_progress') return reject(409, 'ALREADY_SUBMITTED', 'Urinish allaqachon yakunlangan.');
    await available(tx, attempt.lessonId);
    const [q] = await tx.select().from(questions).where(and(eq(questions.id, questionId), eq(questions.versionId, attempt.versionId)));
    if (!q) return reject(404, 'QUESTION_NOT_FOUND', 'Savol topilmadi.');
    validateQuestion(q);
    if(q.content.task) {
      const obj=responseParts(response),t=q.content.task;
      if(Object.keys(obj).some(k=>!t.parts.some(p=>p.id===k)&&!(t.control==='order'&&k==='_order')))reject(400,'INVALID_RESPONSE','Javob qismlari noto‘g‘ri.');
      if(!response.startsWith('{') || t.parts.some(p=>obj[p.id]!==undefined && typeof obj[p.id]!=='string' && !(t.control==='multi' && Array.isArray(obj[p.id])))) reject(400,'INVALID_RESPONSE','Javob shakli noto‘g‘ri.');
      if(t.options) for(const v of Object.values(obj)) if((t.control==='choice' && typeof v==='string' && v!=='' && !t.options.some(o=>o.id===v)) || (t.control==='multi' && Array.isArray(v) && (new Set(v).size!==v.length || v.some(x=>!t.options!.some(o=>o.id===x))))) reject(400,'INVALID_OPTION','Javob variantini tanlang.');
    }
    if (q.exerciseType === 'choice' && response !== '' && !q.content.options?.some(o => o.id === response)) return reject(400, 'INVALID_OPTION', 'Javob variantini tanlang.');
    const [current] = await tx.select().from(answers).where(and(eq(answers.attemptId, attempt.id), eq(answers.questionId, questionId)));
    if(current?.response===response && current.revision === (input.expectedRevision as number)+1) return {questionId,revision:current.revision};
    if ((current?.revision ?? 0) !== input.expectedRevision) return reject(409, 'STALE_ANSWER', 'Javob boshqa oynada yangilangan. Saqlangan javobni qayta yuklang.');
    const revision = (current?.revision ?? 0) + 1;
    if (current) await tx.update(answers).set({ response, revision, updatedAt: new Date() }).where(and(eq(answers.attemptId, attempt.id), eq(answers.questionId, questionId)));
    else await tx.insert(answers).values({ attemptId: attempt.id, studentId, versionId: attempt.versionId, questionId, response, revision });
    await tx.update(lessonAttempts).set({ updatedAt: new Date() }).where(eq(lessonAttempts.id, attempt.id));
    await touch(tx, studentId);
    return { questionId, revision };
  });
}
export async function submitAttempt(db: Database, studentId: string, attemptId: string) {
  return db.transaction(async tx => {
    await lockStudent(tx, studentId);
    const attempt = await ownedAttempt(tx, studentId, attemptId);
    if (attempt.status === 'submitted') return result(attempt); // Idempotent retry.
    await available(tx, attempt.lessonId);
    const [version] = await tx.select().from(lessonVersions).where(eq(lessonVersions.id, attempt.versionId));
    const [lesson] = await tx.select().from(lessons).where(eq(lessons.id, attempt.lessonId));
    const qs = await tx.select().from(questions).where(eq(questions.versionId, attempt.versionId));
    if (!qs.length) return reject(409, 'CONTENT_NOT_READY', 'Dars hali tayyor emas.');
    validatePolicy(version.completionPolicy); qs.forEach(validateQuestion);
    const saved = await tx.select().from(answers).where(and(eq(answers.attemptId, attempt.id), eq(answers.studentId, studentId)));
    const [workspace]=await tx.select().from(studyWorkspaces).where(eq(studyWorkspaces.attemptId,attempt.id));
    const checked=await tx.select().from(practiceChecks).where(eq(practiceChecks.attemptId,attempt.id));
    let earned = 0, maximum = 0, pending = false, allAnswered = true;
    for (const q of qs) {
      const answer = saved.find(a => a.questionId === q.id);
      if (!answered(answer?.response,q.content.task?.parts.map(p=>p.id))) allAnswered = false;
      if(lesson.kind==='lesson' && q.content.task && !checked.some(c=>c.questionId===q.id && c.answerRevision===answer?.revision)) allAnswered=false;
      const audioMissing=q.content.task?.listening && workspace?.audioStatus!=='completed';
      if(audioMissing) allAnswered=false;
      const graded = audioMissing ? {earnedPoints:null,reviewStatus:'pending' as const} : grade(q.grading, answer?.response, q.maxPoints);
      earned += graded.earnedPoints ?? 0; maximum += q.maxPoints; pending ||= graded.reviewStatus === 'pending';
      await tx.insert(answers).values({ attemptId: attempt.id, studentId, versionId: attempt.versionId, questionId: q.id, response: answer?.response ?? '', ...graded })
        .onConflictDoUpdate({ target: [answers.attemptId, answers.questionId], set: graded });
    }
    const now = new Date();
    const [submitted] = await tx.update(lessonAttempts).set({ status: 'submitted', submittedAt: now, updatedAt: now, earnedPoints: earned, maxPoints: maximum, pendingReview: pending }).where(eq(lessonAttempts.id, attempt.id)).returning();
    if (lesson.kind === 'lesson' && isCompleted(version.completionPolicy, earned, maximum, pending, allAnswered)) {
      await tx.insert(lessonProgress).values({ studentId, lessonId: lesson.id, completedAttemptId: attempt.id }).onConflictDoNothing();
    }
    await awardLearningCoins(tx, studentId);
    await touch(tx, studentId);
    return result(submitted);
  });
}
// Internal only: future vocabulary evaluator supplies trusted, server-calculated
// counts and a unique source key. No HTTP route accepts readiness or scores.
export async function recordVocabularyResult(db: Database, studentId: string, lessonId: string, versionId: string, sourceKey: string, correct: number, total: number) {
  uuid(lessonId); uuid(versionId);
  if (!Number.isSafeInteger(correct) || !Number.isSafeInteger(total) || total < 1 || correct < 0 || correct > total || !sourceKey || sourceKey.length > 200) return reject(400, 'INVALID_RESULT', 'Natija noto‘g‘ri.');
  return db.transaction(async tx => {
    await lockStudent(tx, studentId);
    const [version] = await tx.select().from(lessonVersions).where(and(eq(lessonVersions.id, versionId), eq(lessonVersions.lessonId, lessonId)));
    if (!version?.publishedAt) return reject(404, 'LESSON_NOT_FOUND', 'Dars topilmadi.');
    await tx.insert(vocabularyResults).values({ studentId, lessonId, versionId, sourceKey, correct, total }).onConflictDoNothing();
    const [stored] = await tx.select().from(vocabularyResults).where(and(eq(vocabularyResults.studentId, studentId), eq(vocabularyResults.sourceKey, sourceKey)));
    if (stored.lessonId !== lessonId || stored.versionId !== versionId || stored.correct !== correct || stored.total !== total) return reject(409, 'RESULT_CONFLICT', 'Natija oldin boshqa ma’lumot bilan saqlangan.');
    const passed = 100 * stored.correct >= 75 * stored.total;
    if (passed) await tx.insert(vocabularyReadiness).values({ studentId, lessonId, versionId, resultId: stored.id }).onConflictDoNothing();
    await awardLearningCoins(tx, studentId);
    await touch(tx, studentId);
    return { passed };
  });
}
