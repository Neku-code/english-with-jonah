import { eq, sql, desc } from 'drizzle-orm';
import type { Database } from '../src/lib/server/db/connect';
import { units, lessons, lessonVersions, questions, vocabularyItems } from '../src/lib/server/db/schema';
import { stableUuid } from '../src/lib/server/learning/unit1';
import { tasksOf, type LessonContent } from '../src/lib/learning/types';
import type { GradingRule } from '../src/lib/server/learning/contracts';
import { validatePolicy, validateQuestion } from '../src/lib/server/learning/grading';

type Curriculum = { id: string; title: string; position: number; content: LessonContent[];
  keys: Record<string, { tasks: Record<string, unknown>; vocabulary: Record<string, string[]> }> };
const canonical = (v: unknown): string => JSON.stringify(v && typeof v === 'object'
  ? Array.isArray(v) ? v.map(x => JSON.parse(canonical(x)))
    : Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b)).map(([k,x]) => [k,JSON.parse(canonical(x))])) : v);

/** Append immutable revisions; publishing twice verifies rather than overwrites. */
export async function publishCurriculum(db: Database, unit: Curriculum) {
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(182759322)`);
    await tx.insert(units).values({ id: unit.id, title: unit.title, position: unit.position, status: 'published' }).onConflictDoNothing();
    for (const lesson of unit.content) {
      const lessonId = stableUuid(lesson.id), versionId = stableUuid(lesson.id + '@' + lesson.version);
      const source = unit.keys[lesson.id];
      const qs = tasksOf(lesson).map(task => {
        const grading = source.tasks[task.id] as GradingRule;
        const image = lesson.images.find(i => i.id === task.imageId);
        if (task.imageId && !image) throw new Error('Missing lesson illustration');
        const q = { id: stableUuid(task.id + '@' + lesson.version), versionId, position: task.number,
          exerciseType: grading.mode === 'manual' ? 'written' as const : 'text' as const, maxPoints: task.maxPoints,
          content: { prompt: task.number + '. ' + task.prompt, task, options: task.options,
            ...(image ? { media: [{ kind: 'image' as const, url: image.url, alt: image.alt }] } : {}) }, grading };
        validateQuestion(q);
        return q;
      });
      if (!qs.length || new Set(qs.map(q => q.id)).size !== qs.length) throw new Error('Invalid questions');
      const vocab = lesson.vocabulary.map((v,i) => {
        const acceptedTranslations = source.vocabulary[v.id];
        if (!acceptedTranslations?.length) throw new Error('Missing vocabulary translations');
        return { id: stableUuid(v.id + '@' + lesson.version), versionId, position: i+1, english: v.english, acceptedTranslations };
      });
      const [existing] = await tx.select().from(lessonVersions).where(eq(lessonVersions.id, versionId));
      if (existing) {
        if (canonical(existing.content) !== canonical(lesson)) throw new Error('Published content mismatch; increment content version');
        const stored = await tx.select().from(questions).where(eq(questions.versionId, versionId));
        if (stored.length !== qs.length || qs.some(q => { const prior = stored.find(p => p.id === q.id); return !prior || prior.maxPoints !== q.maxPoints || canonical(prior.grading) !== canonical(q.grading); })) throw new Error('Published grading mismatch; increment content version');
        const words = await tx.select().from(vocabularyItems).where(eq(vocabularyItems.versionId, versionId));
        if (words.length !== vocab.length || vocab.some(v => { const prior = words.find(w => w.id === v.id); return !prior || prior.english !== v.english || canonical(prior.acceptedTranslations) !== canonical(v.acceptedTranslations); })) throw new Error('Published vocabulary mismatch; increment content version');
        continue;
      }
      await tx.insert(lessons).values({ id: lessonId, unitId: unit.id, position: Number(lesson.number.split('.')[1]), kind: lesson.kind === 'exam' ? 'final_exam' : 'lesson', status: 'published' }).onConflictDoNothing();
      const [previous] = await tx.select({ version: lessonVersions.version }).from(lessonVersions).where(eq(lessonVersions.lessonId, lessonId)).orderBy(desc(lessonVersions.version)).limit(1);
      const completionPolicy = lesson.kind === 'exam' ? { mode: 'all_answered' as const } : { mode: 'practice' as const };
      validatePolicy(completionPolicy);
      await tx.insert(lessonVersions).values({ id: versionId, lessonId, version: (previous?.version ?? 0)+1, title: lesson.number + ' · ' + lesson.title,
        content: lesson as unknown as Record<string,unknown>, completionPolicy, vocabularyRequired: lesson.kind !== 'exam' });
      await tx.insert(questions).values(qs);
      if (vocab.length) await tx.insert(vocabularyItems).values(vocab);
      await tx.update(lessonVersions).set({ publishedAt: new Date() }).where(eq(lessonVersions.id, versionId));
    }
  });
}
