import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db';
import { api } from '#lib/server/http';
import { startAttempt, loadAttempt } from '#lib/server/learning/attempts';
export const POST: RequestHandler = event => api(event, async (student, body) => {
 const db=getDb(),attempt=await startAttempt(db,student,event.params.lessonId,{reviewVocabulary:body.reviewVocabulary===true});
 return body.bootstrap===true?{attempt:await loadAttempt(db,student,attempt.id)}:attempt;
});
