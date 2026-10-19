import {and,eq,sql} from 'drizzle-orm';
import type {Database} from '../db/connect';
import {answers,lessonVersions,lessons,questions,studyWorkspaces,practiceChecks,studyEvents,vocabularySessions,vocabularyItems,vocabularyResults,vocabularyReadiness,vocabularyStudy,students} from '../db/schema';
import {awardLearningCoins} from './rewards';
import {lockStudent} from '../students';
import {uuid,reject,responseText} from '../validation';
import {available,ownedAttempt,saveAnswerLocked,submitLockedAttempt} from './attempts';
import {grade} from './grading';
import {normalizeAuthored} from './authored-grading';
import type {LessonContent} from '../../learning/types';
import audioRegistry from './unit1-audio.json';

export async function checkPractice(db:Database,studentId:string,attemptId:string,input:Record<string,unknown>) {
 const questionId=uuid(input.questionId),requestId=uuid(input.requestId);
 return db.transaction(async tx=>{
  await lockStudent(tx,studentId);const a=await ownedAttempt(tx,studentId,attemptId);
  const {lesson}=await available(tx,a.lessonId);
  if(lesson.kind==='final_exam')reject(409,'NO_PRACTICE','Yakuniy imtihonda oldindan tekshirish mumkin emas.');
  const [q]=await tx.select().from(questions).where(and(eq(questions.id,questionId),eq(questions.versionId,a.versionId)));
  if(!q)reject(404,'QUESTION_NOT_FOUND','Savol topilmadi.');
  const [receipt]=await tx.select().from(practiceChecks).where(eq(practiceChecks.id,requestId));
  if(receipt&&(receipt.attemptId!==a.id||receipt.questionId!==questionId||(input.response!==undefined&&receipt.response!==input.response)))reject(409,'REQUEST_CONFLICT','So‘rov boshqa javob uchun ishlatilgan.');
  if(receipt){
   const [current]=await tx.select().from(answers).where(and(eq(answers.attemptId,a.id),eq(answers.questionId,questionId)));
   if(!current||current.revision!==receipt.answerRevision||current.response!==receipt.response)reject(409,'STALE_ANSWER','Bu tekshiruvdan keyin javob o‘zgargan. Joriy javobni tekshiring.');
   return {...receipt,feedback:'feedback' in q.grading?q.grading.feedback:'',notes:'notes' in q.grading?q.grading.notes:'',attempt:{id:a.id,status:a.status,earnedPoints:a.earnedPoints,maxPoints:a.maxPoints,pendingReview:a.pendingReview},coinsAwarded:0};
  }
  let revision=input.revision;
  if(input.response!==undefined&&a.status==='in_progress')revision=(await saveAnswerLocked(tx,studentId,a,{questionId,response:input.response,expectedRevision:input.expectedRevision},q)).revision;
  const [answer]=await tx.select().from(answers).where(and(eq(answers.attemptId,a.id),eq(answers.questionId,questionId)));
  if(!answer||answer.revision!==revision||(input.response!==undefined&&answer.response!==input.response))reject(409,'SAVE_FIRST','Javob versiyasi o‘zgargan. Sahifani yangilang.');
  const [existing]=await tx.select().from(practiceChecks).where(and(eq(practiceChecks.attemptId,a.id),eq(practiceChecks.questionId,q.id),eq(practiceChecks.answerRevision,answer.revision)));
  if(a.status!=='in_progress'&&!existing)reject(409,'NO_PRACTICE','Bu urinish tugallangan.');
  const [state]=await tx.select().from(studyWorkspaces).where(eq(studyWorkspaces.attemptId,a.id));
  if(q.content.task?.listening&&state?.audioStatus!=='completed')reject(409,'AUDIO_INCOMPLETE','Avval audioni tinglang.');
  const graded=grade(q.grading,answer.response,q.maxPoints);
  const check=existing??(await tx.insert(practiceChecks).values({id:requestId,attemptId:a.id,studentId,versionId:a.versionId,questionId:q.id,answerRevision:answer.revision,response:answer.response,transcriptUsed:state?.transcriptUsed??false,...graded}).returning())[0];
  let completion={attempt:{id:a.id,status:a.status,earnedPoints:a.earnedPoints,maxPoints:a.maxPoints,pendingReview:a.pendingReview},coinsAwarded:0};
  if(a.status==='in_progress'&&a.versionId===lesson.versionId&&lesson.completionPolicy.mode==='practice'&&graded.earnedPoints===q.maxPoints){
   const {rows:[counts]}=await tx.execute<{total:number;correct:number}>(sql`
    SELECT count(*)::int total,count(c.id) FILTER(WHERE c.earned_points=q.max_points AND c.review_status='graded')::int correct
    FROM questions q LEFT JOIN answers ans ON ans.attempt_id=${a.id} AND ans.question_id=q.id
    LEFT JOIN practice_checks c ON c.attempt_id=${a.id} AND c.question_id=q.id AND c.answer_revision=ans.revision
    WHERE q.version_id=${a.versionId}`);
   if(counts.total>0&&counts.correct===counts.total)completion=await submitLockedAttempt(tx,studentId,a);
  }
  return {...check,feedback:'feedback' in q.grading?q.grading.feedback:'',notes:'notes' in q.grading?q.grading.notes:'',...completion};
 });
}
export async function studyAction(db:Database,studentId:string,attemptId:string,input:Record<string,unknown>) {
 return db.transaction(async tx=>{
  await lockStudent(tx,studentId);const a=await ownedAttempt(tx,studentId,attemptId);await available(tx,a.lessonId);
  const [v]=await tx.select().from(lessonVersions).where(eq(lessonVersions.id,a.versionId));const content=v.content as unknown as LessonContent;
  if(!content.sections) reject(409,'INVALID_CONTENT','Dars sozlamalari mavjud emas.');
  await tx.insert(studyWorkspaces).values({attemptId:a.id,sectionId:content.sections[0].id}).onConflictDoNothing();
  const [state]=await tx.select().from(studyWorkspaces).where(eq(studyWorkspaces.attemptId,a.id)).for('update');
  const action=String(input.action);
  if(action==='navigate') {
   if(a.status==='submitted') return state;
   const sectionId=String(input.sectionId),panels=input.panels as Record<string,string>;
   if(!content.sections.some(s=>s.id===sectionId)||!panels||Object.entries(panels).some(([img,p])=>!content.images.some(i=>i.id===img&&(p==='overview'||i.panels.some(panel=>panel.id===p))))) reject(400,'INVALID_SECTION','Bo‘lim topilmadi.');
   if(state.revision!==input.revision) {if(state.sectionId===sectionId&&JSON.stringify(state.panels)===JSON.stringify(panels)) return state;reject(409,'STALE_WORKSPACE','Joylashuv boshqa oynada yangilangan. Sahifani yangilang.');}
   return (await tx.update(studyWorkspaces).set({sectionId,panels,revision:state.revision+1,updatedAt:new Date()}).where(eq(studyWorkspaces.attemptId,a.id)).returning())[0];
  }
  const requestId=uuid(input.requestId);
  const [receipt]=await tx.select().from(studyEvents).where(eq(studyEvents.id,requestId));
  if(receipt) {if(receipt.attemptId!==a.id||receipt.kind!==action) reject(409,'REQUEST_CONFLICT','So‘rov takrorlandi.');return receipt.result;}
  let result:Record<string,unknown>={};
  const turns=(audioRegistry as Record<string,Record<string,{speaker:string;text:string}[]>>)[content.version]?.[content.id];
  if(!turns) reject(409,'AUDIO_UNAVAILABLE','Tinglash matni mavjud emas.');
  if(action==='play') {
   if(a.status==='in_progress'&&content.kind==='exam'&&state.audioPlays>=2) reject(409,'PLAY_LIMIT','Bu urinishda audio ikki marta tinglandi.');
   if(a.status==='in_progress') await tx.update(studyWorkspaces).set({audioPlays:state.audioPlays+1}).where(eq(studyWorkspaces.attemptId,a.id));
   result={turns,plays:a.status==='in_progress'?state.audioPlays+1:state.audioPlays};
  } else if(action==='transcript') {
   if(content.kind==='exam'&&a.status!=='submitted') reject(403,'TRANSCRIPT_HIDDEN','Matn test topshirilgandan keyin ochiladi.');
   await tx.update(studyWorkspaces).set({transcriptUsed:true}).where(eq(studyWorkspaces.attemptId,a.id));result={turns,transcriptUsed:true};
  } else if(action==='audio-complete'||action==='audio-failed') {
   if(a.status!=='in_progress') return {status:state.audioStatus};
   if(action==='audio-complete') {
    const [play]=await tx.select().from(studyEvents).where(and(eq(studyEvents.id,uuid(input.playId)),eq(studyEvents.attemptId,a.id),eq(studyEvents.kind,'play')));
    if(!play) reject(400,'NO_PLAY','Tinglashni qayta boshlang.');
   }
   const status=state.audioStatus==='completed'?'completed':action==='audio-complete'?'completed':'failed';
   await tx.update(studyWorkspaces).set({audioStatus:status}).where(eq(studyWorkspaces.attemptId,a.id));result={status};
  } else reject(400,'INVALID_ACTION','Amal noto‘g‘ri.');
  await tx.insert(studyEvents).values({id:requestId,attemptId:a.id,kind:action,result});return result;
 });
}
export async function vocabularyState(db:Database,studentId:string,lessonId:string,knownVersionId?:string) {
 const versionId=knownVersionId??(await available(db,lessonId)).lesson.versionId;
 const [session]=await db.select().from(vocabularySessions).where(and(eq(vocabularySessions.studentId,studentId),eq(vocabularySessions.versionId,versionId),eq(vocabularySessions.submitted,false)));
 return session?{id:session.id,wordIds:session.wordIds,responses:session.responses}:null;
}
export async function vocabularyAction(db:Database,studentId:string,lessonId:string,input:Record<string,unknown>) {
 return db.transaction(async tx=>{
  await lockStudent(tx,studentId);const {lesson}=await available(tx,lessonId);
  if(!['review','start','answer'].includes(String(input.action))) reject(400,'INVALID_ACTION','Amal noto‘g‘ri.');
  if(lesson.kind==='final_exam') reject(409,'EXAM_VOCAB_REVIEW','Yakuniy test lug‘ati faqat takrorlash uchun.');
  if(input.action==='review') {
   await tx.insert(vocabularyStudy).values({studentId,lessonId,versionId:lesson.versionId}).onConflictDoNothing();
   await tx.update(students).set({lastLearningAt:new Date()}).where(eq(students.id,studentId));
   return {reviewed:true};
  }
  const words=await tx.select().from(vocabularyItems).where(eq(vocabularyItems.versionId,lesson.versionId));
  if(!words.length) reject(409,'NO_WORDS','Lug‘at hali tayyor emas.');
  let [session]=await tx.select().from(vocabularySessions).where(and(eq(vocabularySessions.studentId,studentId),eq(vocabularySessions.versionId,lesson.versionId),eq(vocabularySessions.submitted,false))).for('update');
  if(input.action==='start') {
   if(!session) {
    const {randomInt}=await import('node:crypto');const ids=words.map(w=>w.id);
    for(let i=ids.length-1;i>0;i--){const j=randomInt(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}
    [session]=await tx.insert(vocabularySessions).values({studentId,lessonId,versionId:lesson.versionId,wordIds:ids.slice(0,Math.ceil(ids.length/3))}).returning();
   }
   return {id:session.id,words:session.wordIds.map(id=>({id,english:words.find(w=>w.id===id)!.english})),responses:session.responses};
  }
  const sessionId=uuid(input.sessionId),wordId=uuid(input.wordId),response=responseText(input.response);
  const [requested]=await tx.select().from(vocabularySessions).where(and(eq(vocabularySessions.id,sessionId),eq(vocabularySessions.studentId,studentId),eq(vocabularySessions.versionId,lesson.versionId))).for('update');
  if(!requested) reject(404,'VOCAB_NOT_FOUND','Lug‘at urinishi topilmadi.');
  const previous=requested.responses.find(r=>r.id===wordId),word=words.find(w=>w.id===wordId);
  if(!word||!requested.wordIds.includes(wordId)) reject(400,'WORD_NOT_FOUND','So‘z topilmadi.');
  if(!previous&&(requested.submitted||requested.wordIds[requested.responses.length]!==wordId)) reject(409,'VOCAB_ORDER','Joriy so‘zga javob bering.');
  if(!previous&&!response.trim()) reject(400,'EMPTY_ANSWER','Tarjimani yozing.');
  const correct=previous?.correct??word.acceptedTranslations.some(a=>normalizeAuthored(a)===normalizeAuthored(response));
  const responses=previous?requested.responses:[...requested.responses,{id:wordId,response,correct}];
  const done=responses.length===requested.wordIds.length,score=responses.filter(r=>r.correct).length,passed=100*score>=75*responses.length;
  let coinsAwarded=0;
  if(!previous) {
   await tx.update(vocabularySessions).set({responses,submitted:done,updatedAt:new Date()}).where(eq(vocabularySessions.id,requested.id));
   if(done) {
    const [result]=await tx.insert(vocabularyResults).values({studentId,lessonId,versionId:lesson.versionId,sourceKey:'unit1-vocab:'+requested.id,correct:score,total:responses.length}).returning();
    if(passed) await tx.insert(vocabularyReadiness).values({studentId,lessonId,versionId:lesson.versionId,resultId:result.id}).onConflictDoNothing();
    coinsAwarded=await awardLearningCoins(tx,studentId);
   }
  }
  await tx.update(students).set({lastLearningAt:new Date()}).where(eq(students.id,studentId));
  return {correct,expected:word.acceptedTranslations.join(' / '),responses,done,passed:done&&passed,score,total:requested.wordIds.length,coinsAwarded};
 });
}
