import {error} from '@sveltejs/kit';
import {and,desc,eq,sql} from 'drizzle-orm';
import type {PageServerLoad} from './$types';
import {getDb} from '#lib/server/db';
import {lessonAttempts,lessonVersions} from '#lib/server/db/schema';
import {homeData} from '#lib/server/learning/catalog';
import {loadAttempt} from '#lib/server/learning/attempts';
import {vocabularyState} from '#lib/server/learning/study';
import {requireStudent} from '#lib/server/http';
import {uuid,ServiceError} from '#lib/server/validation';
import type {LessonContent} from '#lib/learning/types.ts';
export const load:PageServerLoad=async event=>{
 const student=requireStudent(event);
 try{
  const id=uuid(event.params.lessonId),db=getDb(),home=await homeData(db,student.id);
  const unit=home.units.find(u=>u.lessons.some(l=>l.id===id)),lesson=unit?.lessons.find(l=>l.id===id);
  if(!lesson||!unit) error(404,'Dars topilmadi.');
  const requested=event.url.searchParams.get('attempt');if(requested)uuid(requested);
  const rows=await db.select().from(lessonAttempts).where(and(eq(lessonAttempts.studentId,student.id),eq(lessonAttempts.lessonId,id),requested?eq(lessonAttempts.id,requested):undefined)).orderBy(desc(lessonAttempts.updatedAt));
  const saved=requested?rows[0]:rows.find(a=>a.status==='in_progress')??rows[0];
  if(requested&&!saved)error(404,'Urinish topilmadi.');
  const [version]=await db.select().from(lessonVersions).where(eq(lessonVersions.id,saved?.versionId??lesson.versionId));
  const content=version.content as unknown as LessonContent;
  if(!content.sections)error(409,'Dars oynasi hali tayyor emas.');
  const {rows:progress}=await db.execute<{lessonId:string;done:number}>(sql`SELECT a.lesson_id AS "lessonId",count(DISTINCT COALESCE(q.content->'task'->>'id',q.id::text))::int done FROM lesson_attempts a JOIN practice_checks c ON c.attempt_id=a.id JOIN questions q ON q.id=c.question_id WHERE a.student_id=${student.id} GROUP BY a.lesson_id`);
  return {student,lesson,content,unit:{...unit,lessons:unit.lessons.map(l=>({...l,taskDone:progress.find(p=>p.lessonId===l.id)?.done??0}))},attempt:saved?await loadAttempt(db,student.id,saved.id):null,vocabularySession:await vocabularyState(db,student.id,id)};
 }catch(e){if(e instanceof ServiceError)error(e.status as 400,e.message);throw e;}
};
