import { and, eq, sql } from 'drizzle-orm';
import type { Database, Connection } from '../db/connect';
import { answers, lessonAttempts, lessonProgress, lessons, lessonVersions, questions, students, vocabularyReadiness, vocabularyStudy, vocabularyResults, studyWorkspaces, practiceChecks, units } from '../db/schema';
import { lockStudent } from '../students';
import { reject, responseText, uuid } from '../validation';
import { publishedCatalog } from './catalog';
import { grade, isCompleted, validatePolicy, validateQuestion } from './grading';
import type { AttemptResult } from './contracts';
import { answered, responseParts } from './authored-grading';
import { awardLearningCoins } from './rewards';

const result = (a: Pick<typeof lessonAttempts.$inferSelect, 'id'|'status'|'earnedPoints'|'maxPoints'|'pendingReview'>): AttemptResult => ({ id: a.id, status: a.status, earnedPoints: a.earnedPoints, maxPoints: a.maxPoints, pendingReview: a.pendingReview });
async function touch(tx: Connection, studentId: string) { await tx.update(students).set({ lastLearningAt: new Date() }).where(eq(students.id, studentId)); }
export async function ownedAttempt(tx: Connection, studentId: string, attemptId: string) {
  const [attempt] = await tx.select().from(lessonAttempts).where(and(eq(lessonAttempts.id, uuid(attemptId)), eq(lessonAttempts.studentId, studentId))).for('update');
  return attempt ?? reject(404, 'ATTEMPT_NOT_FOUND', 'Urinish topilmadi.');
}
export async function available(tx: Connection, lessonId: string) {
  const {rows:[lesson]}=await tx.execute<{id:string;unitId:string;kind:'lesson'|'final_exam';position:number;versionId:string;version:number;title:string;vocabularyRequired:boolean;completionPolicy:import('./contracts').CompletionPolicy;unitTitle:string;unitPosition:number}>(sql`
    SELECT l.id,l.unit_id AS "unitId",l.kind,l.position,v.id AS "versionId",v.version,v.title,v.vocabulary_required AS "vocabularyRequired",v.completion_policy AS "completionPolicy",u.title AS "unitTitle",u.position AS "unitPosition"
    FROM lessons l JOIN units u ON u.id=l.unit_id JOIN lesson_versions v ON v.lesson_id=l.id
    WHERE l.id=${lessonId} AND l.status='published' AND u.status='published' AND v.published_at<=now()
    ORDER BY v.version DESC LIMIT 1`);
  if(!lesson)return reject(404,'LESSON_NOT_FOUND','Dars hozir mavjud emas.');
  const siblings=lesson.kind==='final_exam'?(await publishedCatalog(tx)).find(u=>u.id===lesson.unitId)?.lessons??[]:[lesson];
  return {lesson,unit:{id:lesson.unitId,title:lesson.unitTitle,position:lesson.unitPosition,lessons:siblings}};
}
export async function startAttempt(db: Database, studentId: string, lessonId: string, options: { reviewVocabulary?: boolean } = {}) {
  uuid(lessonId);
  return db.transaction(async tx => {
    await lockStudent(tx, studentId); // Serializes this student's start/save/submit/archive operations.
    const { lesson, unit } = await available(tx, lessonId);
    const [existing] = await tx.select().from(lessonAttempts).where(and(eq(lessonAttempts.studentId, studentId), eq(lessonAttempts.lessonId, lessonId), eq(lessonAttempts.versionId, lesson.versionId), eq(lessonAttempts.status, 'in_progress')));
    if (existing) { await touch(tx, studentId); return result(existing); }
    if (lesson.vocabularyRequired && options.reviewVocabulary === true) await tx.insert(vocabularyStudy).values({studentId,lessonId,versionId:lesson.versionId}).onConflictDoNothing();
    if (lesson.vocabularyRequired) {
      const {rows:[state]}=await tx.execute<{ready:boolean}>(sql`SELECT EXISTS(SELECT 1 FROM vocabulary_readiness WHERE student_id=${studentId} AND version_id=${lesson.versionId}) OR EXISTS(SELECT 1 FROM vocabulary_study WHERE student_id=${studentId} AND version_id=${lesson.versionId}) AS ready`);
      if(!state.ready)return reject(409,'VOCABULARY_REQUIRED','Avval shu darsning lug‘atini ko‘rib chiqing.');
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
  const tx=db;
    const [attempt]=await tx.select({attempt:lessonAttempts,kind:lessons.kind}).from(lessonAttempts)
      .innerJoin(lessons,and(eq(lessons.id,lessonAttempts.lessonId),eq(lessons.status,'published')))
      .innerJoin(students,and(eq(students.id,lessonAttempts.studentId),eq(students.status,'active')))
      .innerJoin(units,and(eq(units.id,lessons.unitId),eq(units.status,'published')))
      .where(and(eq(lessonAttempts.id,uuid(attemptId)),eq(lessonAttempts.studentId,studentId)));
    if(!attempt)return reject(404,'ATTEMPT_NOT_FOUND','Urinish topilmadi.');
    return readAttempt(tx,attempt.attempt,attempt.kind);
}
export type ReadableAttempt = Pick<typeof lessonAttempts.$inferSelect, 'id'|'studentId'|'lessonId'|'versionId'|'status'|'earnedPoints'|'maxPoints'|'pendingReview'>;
// Callers must first verify session ownership and publication, as loadAttempt does.
export async function readAttempt(tx: Connection, attempt: ReadableAttempt, kind: 'lesson'|'final_exam') {
 type ReadQuestion=Pick<typeof questions.$inferSelect,'id'|'exerciseType'|'content'|'grading'|'maxPoints'|'position'>;
 const {rows:[snapshot]}=await tx.execute<{
  questions:ReadQuestion[];
  answers:{questionId:string;response:string;revision:number;earnedPoints:number|null;reviewStatus:string;feedback:string|null}[];
  workspace:typeof studyWorkspaces.$inferSelect|null;
  checks:(typeof practiceChecks.$inferSelect)[];
 }>(sql`SELECT
  COALESCE((SELECT jsonb_agg(q ORDER BY q.position) FROM (SELECT id,exercise_type AS "exerciseType",content,grading,max_points AS "maxPoints",position FROM questions WHERE version_id=${attempt.versionId}) q),'[]'::jsonb) AS questions,
  COALESCE((SELECT jsonb_agg(e) FROM (SELECT question_id AS "questionId",response #>> '{}' AS response,revision,effective_points AS "earnedPoints",effective_status AS "reviewStatus",feedback FROM effective_answers WHERE attempt_id=${attempt.id} AND student_id=${attempt.studentId}) e),'[]'::jsonb) AS answers,
  (SELECT to_jsonb(w) FROM (SELECT attempt_id AS "attemptId",section_id AS "sectionId",panels,revision,audio_plays AS "audioPlays",audio_status AS "audioStatus",transcript_used AS "transcriptUsed",updated_at AS "updatedAt" FROM study_workspaces WHERE attempt_id=${attempt.id}) w) AS workspace,
  COALESCE((SELECT jsonb_agg(c ORDER BY c."createdAt") FROM (SELECT id,attempt_id AS "attemptId",student_id AS "studentId",version_id AS "versionId",question_id AS "questionId",answer_revision AS "answerRevision",response,earned_points AS "earnedPoints",review_status AS "reviewStatus",transcript_used AS "transcriptUsed",created_at AS "createdAt" FROM practice_checks WHERE attempt_id=${attempt.id} AND ${kind==='lesson'}) c),'[]'::jsonb) AS checks`);
 const byId=new Map(snapshot.questions.map(q=>[q.id,q]));
 return {...result(attempt),lessonId:attempt.lessonId,versionId:attempt.versionId,
  workspace:snapshot.workspace?{...snapshot.workspace,updatedAt:new Date(snapshot.workspace.updatedAt)}:null,
  questions:snapshot.questions.map(q=>({id:q.id,exerciseType:q.exerciseType,maxPoints:q.maxPoints,position:q.position,
   content:{prompt:q.content.prompt,...(q.content.task?{task:q.content.task}:{}),...(q.content.options?{options:q.content.options.map(o=>({id:o.id,label:o.label}))}:{})},
   feedback:attempt.status==='submitted'&&'feedback'in q.grading?q.grading.feedback:null})),
  answers:snapshot.answers,
  checks:snapshot.checks.map(c=>{const grading=byId.get(c.questionId)?.grading;return {...c,createdAt:new Date(c.createdAt),feedback:grading&&'feedback'in grading?grading.feedback:''};})};
}
type AnswerInput = { questionId: unknown; response: unknown; expectedRevision: unknown };
function validateAnswerResponse(q: typeof questions.$inferSelect, response: string) {
    validateQuestion(q);
    if(q.content.task) {
      const obj=responseParts(response),t=q.content.task;
      if(Object.keys(obj).some(k=>!t.parts.some(p=>p.id===k)&&!(t.control==='order'&&k==='_order')))reject(400,'INVALID_RESPONSE','Javob qismlari noto‘g‘ri.');
      if(!response.startsWith('{') || t.parts.some(p=>obj[p.id]!==undefined && typeof obj[p.id]!=='string' && !(t.control==='multi' && Array.isArray(obj[p.id])))) reject(400,'INVALID_RESPONSE','Javob shakli noto‘g‘ri.');
      if(t.options) for(const v of Object.values(obj)) if((t.control==='choice' && typeof v==='string' && v!=='' && !t.options.some(o=>o.id===v)) || (t.control==='multi' && Array.isArray(v) && (new Set(v).size!==v.length || v.some(x=>!t.options!.some(o=>o.id===x))))) reject(400,'INVALID_OPTION','Javob variantini tanlang.');
    }
    if (q.exerciseType === 'choice' && response !== '' && !q.content.options?.some(o => o.id === response)) reject(400, 'INVALID_OPTION', 'Javob variantini tanlang.');

}
export async function saveAnswerLocked(tx: Connection, studentId: string, attempt: typeof lessonAttempts.$inferSelect, input: AnswerInput, providedQuestion?: typeof questions.$inferSelect) {
  const questionId=uuid(input.questionId),response=responseText(input.response);
  if(!Number.isSafeInteger(input.expectedRevision)||(input.expectedRevision as number)<0)return reject(400,'INVALID_REVISION','Javob versiyasi noto‘g‘ri.');
  if(attempt.status!=='in_progress')return reject(409,'ALREADY_SUBMITTED','Urinish allaqachon yakunlangan.');
    const [q] = providedQuestion ? [providedQuestion] : await tx.select().from(questions).where(and(eq(questions.id, questionId), eq(questions.versionId, attempt.versionId)));
    if (!q || q.id !== questionId || q.versionId !== attempt.versionId) return reject(404, 'QUESTION_NOT_FOUND', 'Savol topilmadi.');
    validateAnswerResponse(q,response);
    const [current] = await tx.select().from(answers).where(and(eq(answers.attemptId, attempt.id), eq(answers.questionId, questionId)));
    if(current?.response===response && (current.revision === input.expectedRevision || current.revision === (input.expectedRevision as number)+1)) return {questionId,revision:current.revision};
    if ((current?.revision ?? 0) !== input.expectedRevision) return reject(409, 'STALE_ANSWER', 'Javob boshqa oynada yangilangan. Saqlangan javobni qayta yuklang.');
    const revision = (current?.revision ?? 0) + 1;
    if (current) await tx.update(answers).set({ response, revision, updatedAt: new Date() }).where(and(eq(answers.attemptId, attempt.id), eq(answers.questionId, questionId)));
    else await tx.insert(answers).values({ attemptId: attempt.id, studentId, versionId: attempt.versionId, questionId, response, revision });
    await tx.update(lessonAttempts).set({ updatedAt: new Date() }).where(eq(lessonAttempts.id, attempt.id));
    await touch(tx, studentId);
    return { questionId, revision };

}
export async function saveAnswers(db: Database, studentId: string, attemptId: string, inputs: AnswerInput[]) {
 if(!Array.isArray(inputs)||!inputs.length||inputs.length>100||inputs.some(input=>!input||typeof input!=='object'||Array.isArray(input)))reject(400,'INVALID_ANSWERS','Javoblar ro‘yxati noto‘g‘ri.');
 const batch=inputs.map(input=>({questionId:uuid(input.questionId),response:responseText(input.response),expectedRevision:input.expectedRevision}));
 if(new Set(batch.map(a=>a.questionId)).size!==batch.length)reject(400,'INVALID_ANSWERS','Bir savol ikki marta yuborilmasin.');
 return db.transaction(async tx=>{
  await lockStudent(tx,studentId);const attempt=await ownedAttempt(tx,studentId,attemptId);await available(tx,attempt.lessonId);
  if(attempt.status!=='in_progress')reject(409,'ALREADY_SUBMITTED','Urinish allaqachon yakunlangan.');
  const qs=await tx.select().from(questions).where(eq(questions.versionId,attempt.versionId));
  const current=await tx.select().from(answers).where(eq(answers.attemptId,attempt.id));
  const changed:(typeof answers.$inferInsert)[]=[],saved:{questionId:string;revision:number}[]=[];
  for(const input of batch){
   if(!Number.isSafeInteger(input.expectedRevision)||(input.expectedRevision as number)<0)reject(400,'INVALID_REVISION','Javob versiyasi noto‘g‘ri.');
   const q=qs.find(q=>q.id===input.questionId);if(!q)reject(404,'QUESTION_NOT_FOUND','Savol topilmadi.');validateAnswerResponse(q,input.response);
   const previous=current.find(a=>a.questionId===q.id),expected=input.expectedRevision as number;
   if(previous?.response===input.response&&(previous.revision===expected||previous.revision===expected+1)){saved.push({questionId:q.id,revision:previous.revision});continue;}
   if((previous?.revision??0)!==expected)reject(409,'STALE_ANSWER','Javob boshqa oynada yangilangan. Qayta yuklang.');
   const revision=expected+1;saved.push({questionId:q.id,revision});changed.push({attemptId:attempt.id,studentId,versionId:attempt.versionId,questionId:q.id,response:input.response,revision,updatedAt:new Date()});
  }
  if(changed.length){
   await tx.insert(answers).values(changed).onConflictDoUpdate({target:[answers.attemptId,answers.questionId],set:{response:sql`excluded.response`,revision:sql`excluded.revision`,updatedAt:sql`excluded.updated_at`}});
   await tx.update(lessonAttempts).set({updatedAt:new Date()}).where(eq(lessonAttempts.id,attempt.id));await touch(tx,studentId);
  }
  return {saved};
 });
}
export async function saveAnswer(db: Database, studentId: string, attemptId: string, input: AnswerInput) {
 return (await saveAnswers(db,studentId,attemptId,[input])).saved[0];
}
export async function submitLockedAttempt(tx: Connection, studentId: string, attempt: typeof lessonAttempts.$inferSelect) {
 if(attempt.status==='submitted')return {attempt:result(attempt),coinsAwarded:0};
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
    const gradedAnswers: (typeof answers.$inferInsert)[] = [];
    for (const q of qs) {
      const answer = saved.find(a => a.questionId === q.id);
      if (!answered(answer?.response,q.content.task?.parts.map(p=>p.id))) allAnswered = false;
      if(lesson.kind==='lesson' && q.content.task && !checked.some(c=>c.questionId===q.id && c.answerRevision===answer?.revision)) allAnswered=false;
      const audioMissing=q.content.task?.listening && workspace?.audioStatus!=='completed';
      if(audioMissing) allAnswered=false;
      const graded = audioMissing && version.content.automatic === true ? {earnedPoints:0,reviewStatus:'graded' as const} : audioMissing ? {earnedPoints:null,reviewStatus:'pending' as const} : grade(q.grading, answer?.response, q.maxPoints);
      earned += graded.earnedPoints ?? 0; maximum += q.maxPoints; pending ||= graded.reviewStatus === 'pending';
      gradedAnswers.push({ attemptId: attempt.id, studentId, versionId: attempt.versionId, questionId: q.id, response: answer?.response ?? '', ...graded });
    }
    if(version.completionPolicy.mode==='practice'&&!isCompleted(version.completionPolicy,earned,maximum,pending,allAnswered))return reject(409,'PRACTICE_INCOMPLETE','Barcha mashqlarni to‘g‘ri bajaring. Xatolarni tuzatishingiz mumkin.');
    // One write for all marks. Preserve the response/revision on existing rows.
    await tx.insert(answers).values(gradedAnswers).onConflictDoUpdate({
      target: [answers.attemptId, answers.questionId],
      set: { earnedPoints: sql`excluded.earned_points`, reviewStatus: sql`excluded.review_status` }
    });
    const now = new Date();
    const [submitted] = await tx.update(lessonAttempts).set({ status: 'submitted', submittedAt: now, updatedAt: now, earnedPoints: earned, maxPoints: maximum, pendingReview: pending }).where(eq(lessonAttempts.id, attempt.id)).returning();
    if (lesson.kind === 'lesson' && isCompleted(version.completionPolicy, earned, maximum, pending, allAnswered)) {
      await tx.insert(lessonProgress).values({ studentId, lessonId: lesson.id, completedAttemptId: attempt.id }).onConflictDoNothing();
    }
    const coinsAwarded=await awardLearningCoins(tx, studentId);
    await touch(tx, studentId);
    return {attempt:result(submitted),coinsAwarded};

}
export async function submitAttempt(db: Database, studentId: string, attemptId: string) {
 return db.transaction(async tx=>{
  await lockStudent(tx,studentId);const attempt=await ownedAttempt(tx,studentId,attemptId);
  return (await submitLockedAttempt(tx,studentId,attempt)).attempt;
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
