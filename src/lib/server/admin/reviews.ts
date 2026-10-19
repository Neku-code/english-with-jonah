import { and, asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/connect';
import { answers, lessonAttempts, lessonProgress, lessons, lessonVersions, questions, students, teacherReviews } from '../db/schema';
import { lockTeacherSession } from '../teacher-sessions';
import { isCompleted } from '../learning/grading';
import { answered } from '../learning/authored-grading';
import { reject, responseText, uuid } from '../validation';

export async function saveReview(db: Database, teacherId: string, attemptId: string, questionId: string, input: {
  requestId: unknown; expectedRevision: unknown; feedback: unknown; points: unknown;
}) {
  uuid(attemptId); uuid(questionId); const requestId = uuid(input.requestId);
  const feedback = responseText(input.feedback);
  const expected = Number(input.expectedRevision);
  if (!Number.isSafeInteger(expected) || expected < 0 || input.expectedRevision === '') reject(400, 'INVALID_REVISION', 'Baholash versiyasi noto‘g‘ri.');
  const rawPoints = input.points;
  if (rawPoints !== '' && rawPoints !== null && (typeof rawPoints !== 'string' || !/^\d+$/.test(rawPoints))) reject(400, 'INVALID_POINTS', 'Ball butun, manfiy bo‘lmagan son bo‘lsin.');
  const points = rawPoints === '' || rawPoints === null ? null : Number(rawPoints);
  return db.transaction(async tx => {
    await lockTeacherSession(tx, teacherId);
    const [owner] = await tx.select({ studentId: lessonAttempts.studentId }).from(lessonAttempts).where(eq(lessonAttempts.id, attemptId));
    if (!owner) reject(404, 'ATTEMPT_NOT_FOUND', 'Urinish topilmadi.');
    // Same student -> attempt lock order as learning writes. Inactive students remain reviewable.
    await tx.select({ id: students.id }).from(students).where(eq(students.id, owner.studentId)).for('update');
    const [attempt] = await tx.select().from(lessonAttempts).where(eq(lessonAttempts.id, attemptId)).for('update');
    if (attempt.status !== 'submitted') reject(409, 'NOT_SUBMITTED', 'Hali topshirilmagan urinishni baholab bo‘lmaydi.');
    const [receipt] = await tx.select().from(teacherReviews).where(eq(teacherReviews.requestId, requestId));
    if (receipt) {
      if (receipt.attemptId !== attemptId || receipt.questionId !== questionId || receipt.feedback !== feedback || receipt.awardedPoints !== points || receipt.revision !== expected + 1) reject(409, 'REQUEST_CONFLICT', 'So‘rov oldin boshqa ma’lumot bilan saqlangan. Sahifani yangilang.');
      return receipt;
    }
    const [answer] = await tx.select().from(answers).where(and(eq(answers.attemptId, attemptId), eq(answers.questionId, questionId)));
    if (!answer) reject(404, 'ANSWER_NOT_FOUND', 'Saqlangan javob topilmadi.');
    const [q] = await tx.select().from(questions).where(and(eq(questions.id, questionId), eq(questions.versionId, attempt.versionId)));
    if (q?.grading?.mode !== 'manual' && answer.reviewStatus !== 'pending') reject(400, 'NOT_MANUAL', 'Bu javob avtomatik baholanadi.');
    const configured = q && Number.isSafeInteger(q.maxPoints) && q.maxPoints > 0;
    if (points !== null && (!configured || !Number.isSafeInteger(points) || points > q.maxPoints)) reject(400, 'INVALID_POINTS', configured ? `Ball 0–${q.maxPoints} oralig‘ida bo‘lsin.` : 'Savolda maksimal ball belgilanmagan. Faqat izoh saqlash mumkin.');
    if (points === null && !feedback.trim()) reject(400, 'EMPTY_REVIEW', 'Ball yoki izoh kiriting.');
    const { rows: latest } = await tx.execute<{ revision: number }>(sql`SELECT COALESCE(max(revision),0)::int revision FROM teacher_reviews WHERE attempt_id=${attemptId} AND question_id=${questionId}`);
    if (latest[0].revision !== expected) reject(409, 'STALE_REVIEW', 'Bu javob boshqa oynada baholangan. Sahifani yangilang va qayta tekshiring.');
    const [review] = await tx.insert(teacherReviews).values({ requestId, attemptId, questionId, teacherSessionId: teacherId, revision: expected + 1, feedback, awardedPoints: points }).returning();
    const { rows: totals } = await tx.execute<{ earned: number; maximum: number; pending: boolean }>(sql`
      SELECT COALESCE(sum(e.effective_points),0)::int earned,sum(q.max_points)::int maximum,bool_or(e.effective_status='pending') pending
      FROM effective_answers e JOIN questions q ON q.id=e.question_id WHERE e.attempt_id=${attemptId}`);
    const total = totals[0];
    // Only the effective result changes. Submission/activity dates and automatic answers stay immutable.
    await tx.update(lessonAttempts).set({ earnedPoints: total.earned, maxPoints: total.maximum, pendingReview: total.pending }).where(eq(lessonAttempts.id, attemptId));
    const [lesson] = await tx.select().from(lessons).where(eq(lessons.id, attempt.lessonId));
    if (lesson.kind === 'lesson') {
      const candidates = await tx.select({ attempt: lessonAttempts, policy: lessonVersions.completionPolicy }).from(lessonAttempts)
        .innerJoin(lessonVersions, eq(lessonVersions.id, lessonAttempts.versionId))
        .where(and(eq(lessonAttempts.studentId, attempt.studentId), eq(lessonAttempts.lessonId, attempt.lessonId), eq(lessonAttempts.status, 'submitted')))
        .orderBy(asc(lessonAttempts.submittedAt), asc(lessonAttempts.id));
      const eligible = [];
      for (const candidate of candidates) {
        const a = candidate.attempt;
        const responses = await tx.select({ response: answers.response, grading: questions.grading }).from(answers).innerJoin(questions, eq(questions.id, answers.questionId)).where(eq(answers.attemptId, a.id));
        const {rows:[study]}=await tx.execute<{ready:boolean}>(sql`SELECT NOT EXISTS(SELECT 1 FROM questions q LEFT JOIN answers ans ON ans.question_id=q.id AND ans.attempt_id=${a.id} WHERE q.version_id=${a.versionId} AND q.content ? 'task' AND (NOT EXISTS(SELECT 1 FROM practice_checks c WHERE c.attempt_id=${a.id} AND c.question_id=q.id AND c.answer_revision=ans.revision) OR (q.content->'task'->>'listening'='true' AND NOT EXISTS(SELECT 1 FROM study_workspaces w WHERE w.attempt_id=${a.id} AND w.audio_status='completed')))) ready`);
        const allAnswered = study.ready && responses.length > 0 && responses.every(r => answered(r.response, 'partIds' in r.grading ? r.grading.partIds : undefined));
        if (isCompleted(candidate.policy, a.earnedPoints ?? 0, a.maxPoints ?? 0, a.pendingReview, allAnswered)) eligible.push(a);
      }
      const condition = and(eq(lessonProgress.studentId, attempt.studentId), eq(lessonProgress.lessonId, attempt.lessonId));
      const [current] = await tx.select().from(lessonProgress).where(condition);
      if (!eligible.some(a => a.id === current?.completedAttemptId)) {
        if (current) await tx.delete(lessonProgress).where(condition);
        if (eligible[0]) await tx.insert(lessonProgress).values({ studentId: attempt.studentId, lessonId: attempt.lessonId, completedAttemptId: eligible[0].id });
      }
    }
    // Final-exam mastery is derived by homeData from all effective submitted results.
    return review;
  });
}
