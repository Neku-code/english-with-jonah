import { eq } from 'drizzle-orm';
import type { Database } from '../src/lib/server/db/connect';
import { units, lessons, lessonVersions, questions } from '../src/lib/server/db/schema';
import type { CompletionPolicy, GradingRule } from '../src/lib/server/learning/contracts';
let position = 0;
// Synthetic tokens only, never application curriculum. All rows live in an
// isolated PostgreSQL cluster that is destroyed after verification.
export async function fixture(db: Database, options: { published?: boolean; unitPublished?: boolean; vocabulary?: boolean; policy?: CompletionPolicy; manual?: boolean; kind?: 'lesson' | 'final_exam'; unitId?: string } = {}) {
  const [unit] = options.unitId ? [{ id: options.unitId }] : await db.insert(units).values({ title: `Synthetic ${++position}`, position, status: options.unitPublished === false ? 'draft' : 'published' }).returning();
  const siblings = await db.select().from(lessons).where(eq(lessons.unitId, unit.id));
  const [lesson] = await db.insert(lessons).values({ unitId: unit.id, position: siblings.length + 1, status: options.published === false ? 'draft' : 'published', kind: options.kind ?? 'lesson' }).returning();
  const [version] = await db.insert(lessonVersions).values({ lessonId: lesson.id, version: 1, title: 'Synthetic record', vocabularyRequired: options.vocabulary ?? false,
    completionPolicy: options.policy ?? { mode: 'score', minimumPercent: 100 } }).returning();
  const [question] = await db.insert(questions).values({ versionId: version.id, exerciseType: options.manual ? 'written' : 'text', content: { prompt: 'Synthetic token' },
    grading: options.manual ? { mode: 'manual' } : { mode: 'exact', accepted: ['token'], caseSensitive: false, normalizeApostrophes: true }, maxPoints: 10, position: 1 }).returning();
  if (options.published !== false) await db.update(lessonVersions).set({ publishedAt: new Date() }).where(eq(lessonVersions.id, version.id));
  return { unit, lesson, version, question };
}
export async function newRevision(db: Database, lessonId: string, rule: GradingRule = { mode: 'exact', accepted: ['new-token'], caseSensitive: true, normalizeApostrophes: false }, vocabularyRequired = false) {
  const [version] = await db.insert(lessonVersions).values({ lessonId, version: 2, title: 'Synthetic revision 2', vocabularyRequired, completionPolicy: { mode: 'all_answered' } }).returning();
  const [question] = await db.insert(questions).values({ versionId: version.id, exerciseType: 'text', content: { prompt: 'Synthetic revision token' }, grading: rule, maxPoints: 10, position: 1 }).returning();
  await db.update(lessonVersions).set({ publishedAt: new Date() }).where(eq(lessonVersions.id, version.id));
  return { version, question };
}
