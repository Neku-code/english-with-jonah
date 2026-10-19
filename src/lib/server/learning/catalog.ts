import { and, asc, desc, eq, isNotNull, lte } from 'drizzle-orm';
import type { Connection } from '../db/connect';
import { lessonAttempts, lessonProgress, lessons, lessonVersions, units, vocabularyReadiness } from '../db/schema';

export async function publishedCatalog(db: Connection) {
  const publishedUnits = await db.select({ id: units.id, title: units.title, position: units.position }).from(units).where(eq(units.status, 'published')).orderBy(units.position);
  const rows = await db.select({ id: lessons.id, unitId: lessons.unitId, kind: lessons.kind, position: lessons.position,
    versionId: lessonVersions.id, version: lessonVersions.version, title: lessonVersions.title, vocabularyRequired: lessonVersions.vocabularyRequired })
    .from(lessons).innerJoin(units, eq(units.id, lessons.unitId)).innerJoin(lessonVersions, eq(lessonVersions.lessonId, lessons.id))
    .where(and(eq(units.status, 'published'), eq(lessons.status, 'published'), isNotNull(lessonVersions.publishedAt), lte(lessonVersions.publishedAt, new Date())))
    .orderBy(asc(lessons.position), desc(lessonVersions.version));
  const seen = new Set<string>();
  const latest = rows.filter(row => { if (seen.has(row.id)) return false; seen.add(row.id); return true; });
  return publishedUnits.map(unit => ({ ...unit, lessons: latest.filter(row => row.unitId === unit.id) }));
}
export async function homeData(db: Connection, studentId: string) {
  const catalog = await publishedCatalog(db);
  const progress = await db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress).where(eq(lessonProgress.studentId, studentId));
  const readiness = await db.select({ versionId: vocabularyReadiness.versionId }).from(vocabularyReadiness).where(eq(vocabularyReadiness.studentId, studentId));
  const activity = await db.select({ id: lessonAttempts.id, lessonId: lessonAttempts.lessonId, versionId: lessonAttempts.versionId, status: lessonAttempts.status,
    updatedAt: lessonAttempts.updatedAt, earnedPoints: lessonAttempts.earnedPoints, maxPoints: lessonAttempts.maxPoints, pendingReview: lessonAttempts.pendingReview,
    title: lessonVersions.title })
    .from(lessonAttempts).innerJoin(lessonVersions, eq(lessonVersions.id, lessonAttempts.versionId))
    .where(eq(lessonAttempts.studentId, studentId)).orderBy(desc(lessonAttempts.updatedAt));
  const complete = new Set(progress.map(p => p.lessonId));
  const ready = new Set(readiness.map(p => p.versionId));
  const visible = new Set(catalog.flatMap(u => u.lessons.map(l => l.id)));
  const active = activity.filter(a => visible.has(a.lessonId));
  const resume = active.find(a => a.status === 'in_progress');
  const data = catalog.map(unit => {
    const regular = unit.lessons.filter(l => l.kind === 'lesson');
    const finished = regular.filter(l => complete.has(l.id)).length;
    const exam = unit.lessons.find(l => l.kind === 'final_exam');
    const examResults = exam ? active.filter(a => a.lessonId === exam.id && a.status === 'submitted') : [];
    // Successful historical submissions remain successful after a later failure.
    const mastered = regular.length > 0 && finished === regular.length && examResults.some(a => !a.pendingReview && a.maxPoints && a.earnedPoints !== null && 100 * a.earnedPoints >= 90 * a.maxPoints);
    return { ...unit, finished, total: regular.length, mastered,
      points: (regular.length ? 50 * finished / regular.length : 0) + (mastered ? 50 : 0),
      examResult: examResults[0] ? { earnedPoints: examResults[0].earnedPoints, maxPoints: examResults[0].maxPoints, pendingReview: examResults[0].pendingReview } : null,
      lessons: unit.lessons.map(lesson => ({ ...lesson,
        completed: lesson.kind === 'final_exam' ? mastered : complete.has(lesson.id), inProgress: active.some(a => a.lessonId === lesson.id && a.status === 'in_progress'),
        needsVocabulary: lesson.vocabularyRequired && !ready.has(lesson.versionId),
        needsLessons: lesson.kind === 'final_exam' && (regular.length === 0 || finished < regular.length),
        href: `/learn/${lesson.id}` })) };
  });
  const first = data.flatMap(u => u.lessons).find(l => !l.completed && !l.needsLessons);
  return { units: data, lessonCount: visible.size,
    primary: resume ? { label: 'Davom ettirish', title: resume.title, href: `/learn/${resume.lessonId}?attempt=${resume.id}` }
      : first ? { label: first.needsVocabulary ? 'Darsni ko‘rish' : 'Boshlash', title: first.title, href: first.href } : null,
    recent: active.slice(0, 3).map(a => ({ id: a.id, title: a.title, status: a.status, updatedAt: a.updatedAt.toISOString(),
      pendingReview: a.pendingReview, earnedPoints: a.earnedPoints, maxPoints: a.maxPoints })) };
}
