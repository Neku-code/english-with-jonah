import {error,redirect} from '@sveltejs/kit';
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
  if(!lesson||!unit)error(404,'Dars topilmadi.');
  const requested=event.url.searchParams.get('attempt');if(requested)uuid(requested);
  const [saved]=await db.select().from(lessonAttempts)
   .where(and(eq(lessonAttempts.studentId,student.id),eq(lessonAttempts.lessonId,id),requested?eq(lessonAttempts.id,requested):eq(lessonAttempts.versionId,lesson.versionId)))
   .orderBy(desc(sql`${lessonAttempts.status}='in_progress'`),desc(lessonAttempts.updatedAt)).limit(1);
  if(requested&&!saved)error(404,'Urinish topilmadi.');
  if(saved&&saved.versionId!==lesson.versionId)redirect(303,`/learn/${id}`);
  const [[version],attempt,vocabularySession]=await Promise.all([
   db.select({content:lessonVersions.content}).from(lessonVersions).where(eq(lessonVersions.id,saved?.versionId??lesson.versionId)),
   saved?loadAttempt(db,student.id,saved.id):null,
   vocabularyState(db,student.id,id,lesson.versionId)
  ]);
  const content=version.content as unknown as LessonContent;
  if(!content.sections)error(409,'Dars oynasi hali tayyor emas.');
  return {student,lesson,content,unit,attempt,vocabularySession};
 }catch(e){if(e instanceof ServiceError)error(e.status as 400,e.message);throw e;}
};
