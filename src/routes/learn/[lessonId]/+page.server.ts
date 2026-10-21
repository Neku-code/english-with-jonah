import {error,redirect} from '@sveltejs/kit';
import {sql} from 'drizzle-orm';
import type {PageServerLoad} from './$types';
import {getDb} from '#lib/server/db';
import {homeData} from '#lib/server/learning/catalog';
import {readAttempt,type ReadableAttempt} from '#lib/server/learning/attempts';
import {vocabularyState} from '#lib/server/learning/study';
import {requireStudent} from '#lib/server/http';
import {uuid,ServiceError} from '#lib/server/validation';
import type {LessonContent} from '#lib/learning/types.ts';

export const load:PageServerLoad=async event=>{
 const student=requireStudent(event);
 try{
  const id=uuid(event.params.lessonId),db=getDb();
  const requested=event.url.searchParams.get('attempt');if(requested)uuid(requested);
  // Fetch the visible revision, its display content and an owned attempt together.
  // Catalog/progress runs concurrently, not before these reads.
  const [home,{rows:[snapshot]}]=await Promise.all([
   homeData(db,student.id),
   db.execute<{content:LessonContent;versionId:string;saved:ReadableAttempt|null}>(sql`
    SELECT v.content,v.id AS "versionId",to_jsonb(a) AS saved
    FROM lessons l JOIN units u ON u.id=l.unit_id
    JOIN LATERAL (SELECT id,content FROM lesson_versions WHERE lesson_id=l.id AND published_at<=now() ORDER BY version DESC LIMIT 1) v ON true
    LEFT JOIN LATERAL (
     SELECT id,student_id AS "studentId",lesson_id AS "lessonId",version_id AS "versionId",status,
       earned_points AS "earnedPoints",max_points AS "maxPoints",pending_review AS "pendingReview"
     FROM lesson_attempts WHERE student_id=${student.id} AND lesson_id=l.id
       AND ${requested ? sql`id=${requested}` : sql`version_id=v.id`}
     ORDER BY (status='in_progress') DESC,updated_at DESC,id LIMIT 1
    ) a ON true
    WHERE l.id=${id} AND l.status='published' AND u.status='published'`)
  ]);
  const unit=home.units.find(u=>u.lessons.some(l=>l.id===id)),lesson=unit?.lessons.find(l=>l.id===id);
  if(!lesson||!unit||!snapshot)error(404,'Dars topilmadi.');
  if(requested&&!snapshot.saved)error(404,'Urinish topilmadi.');
  if(snapshot.versionId!==lesson.versionId||snapshot.saved&&snapshot.saved.versionId!==lesson.versionId)redirect(303,`/learn/${id}`);
  if(!snapshot.content.sections)error(409,'Dars oynasi hali tayyor emas.');
  const [attempt,vocabularySession]=await Promise.all([
   snapshot.saved?readAttempt(db,snapshot.saved,lesson.kind):null,
   lesson.kind==='lesson'?vocabularyState(db,student.id,id,lesson.versionId):null
  ]);
  return {student,lesson,content:snapshot.content,unit,attempt,vocabularySession};
 }catch(e){if(e instanceof ServiceError)error(e.status as 400,e.message);throw e;}
};
