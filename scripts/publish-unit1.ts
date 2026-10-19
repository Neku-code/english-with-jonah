import { eq, sql,desc } from 'drizzle-orm';
import { connectDatabase } from '../src/lib/server/db/connect';
import { units, lessons, lessonVersions, questions, vocabularyItems } from '../src/lib/server/db/schema';
import { unit1, unit1Keys, unit1Id, stableUuid } from '../src/lib/server/learning/unit1';
import { tasksOf } from '../src/lib/learning/types';
import type { GradingRule } from '../src/lib/server/learning/contracts';

export async function publishUnit1(db: ReturnType<typeof connectDatabase>['db']) {
  const canonical=(v:unknown):string=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,JSON.parse(canonical(x))])):v);
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(182759322)`);
    await tx.insert(units).values({ id: unit1Id, title: 'Unit 1 · To Be', position: 1, status: 'published' }).onConflictDoNothing();
    for (const lesson of unit1) {
      const lessonId = stableUuid(lesson.id), versionId = stableUuid(lesson.id + '@' + lesson.version);
      const [existing] = await tx.select().from(lessonVersions).where(eq(lessonVersions.id, versionId));
      if (existing) {
        if(canonical(existing.content)!==canonical(lesson))throw new Error('Published content mismatch; increment content version');
        const stored=await tx.select().from(questions).where(eq(questions.versionId,versionId));
        const sourceKeys=unit1Keys[lesson.id as keyof typeof unit1Keys].tasks as Record<string,unknown>;
        if(stored.length!==tasksOf(lesson).length||tasksOf(lesson).some(t=>{const q=stored.find(q=>q.content.task?.id===t.id);return !q||q.maxPoints!==t.maxPoints||canonical(q.grading)!==canonical(sourceKeys[t.id]);}))throw new Error('Published grading mismatch; increment content version');
        continue;
      }
      await tx.insert(lessons).values({ id: lessonId, unitId: unit1Id, position: Number(lesson.number.split('.')[1]), kind: lesson.kind === 'exam' ? 'final_exam' : 'lesson', status: 'published' }).onConflictDoNothing();
      const [previous]=await tx.select({version:lessonVersions.version}).from(lessonVersions).where(eq(lessonVersions.lessonId,lessonId)).orderBy(desc(lessonVersions.version)).limit(1);
      await tx.insert(lessonVersions).values({ id: versionId, lessonId, version: (previous?.version??0)+1, title: lesson.number + ' · ' + lesson.title, content: lesson as unknown as Record<string,unknown>, completionPolicy: { mode: 'all_answered' }, vocabularyRequired: lesson.kind !== 'exam' });
      for (const task of tasksOf(lesson)) {
        const key = unit1Keys[lesson.id as keyof typeof unit1Keys].tasks;
        const grading = key[task.id as keyof typeof key] as unknown as GradingRule;
        await tx.insert(questions).values({ id: stableUuid(task.id+'@'+lesson.version), versionId, position: task.number, exerciseType: grading.mode === 'manual' ? 'written' : 'text', maxPoints: task.maxPoints, content: { prompt: task.number+'. '+task.prompt, task, options: task.options, ...(task.imageId ? { media: [{ kind: 'image' as const, url: lesson.images.find(i=>i.id===task.imageId)!.url, alt: lesson.images.find(i=>i.id===task.imageId)!.alt }] } : {}) }, grading });
      }
      const vocabKeys=unit1Keys[lesson.id as keyof typeof unit1Keys].vocabulary as Record<string,string[]>;
      for (const [i,v] of lesson.vocabulary.entries()) await tx.insert(vocabularyItems).values({ id: stableUuid(v.id+'@'+lesson.version), versionId, position: i+1, english:v.english, acceptedTranslations:vocabKeys[v.id] });
      await tx.update(lessonVersions).set({publishedAt:new Date()}).where(eq(lessonVersions.id, versionId));
    }
  });
}
if (process.argv[1]?.replaceAll('\\','/').endsWith('/publish-unit1.ts')) {
  await import('./env.mjs');
  const {db,pool}=connectDatabase(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '');
  try { await publishUnit1(db); console.log('Published Unit 1: 6 revisions, 140 tasks, final exam 24 points.'); }
  catch { console.error('Unit 1 publication failed. Check private DB configuration and content version.'); process.exitCode=1; }
  finally { await pool.end(); }
}
