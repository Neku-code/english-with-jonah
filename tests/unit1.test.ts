import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq,sql} from 'drizzle-orm';
import {unit1,stableUuid,unit1Keys} from '../src/lib/server/learning/unit1';
import {tasksOf} from '../src/lib/learning/types';
import {grade,isCompleted} from '../src/lib/server/learning/grading';
import type {GradingRule} from '../src/lib/server/learning/contracts';
import type {Database} from '../src/lib/server/db/connect';
import {testDatabase} from './database';
import {publishUnit1} from '../scripts/publish-unit1';
import {createStudent} from '../src/lib/server/students';
import {startAttempt,loadAttempt,saveAnswer,submitAttempt,recordVocabularyResult} from '../src/lib/server/learning/attempts';
import {studyAction,checkPractice} from '../src/lib/server/learning/study';
import {questions,lessonProgress,practiceChecks,lessonAttempts,learningRewards} from '../src/lib/server/db/schema';
import {homeData,publishedCatalog} from '../src/lib/server/learning/catalog';
import type {AuthoredRule} from '../src/lib/server/learning/authored-grading';

function correctResponse(q:typeof questions.$inferSelect){
 const g=q.grading as AuthoredRule,t=q.content.task!;
 return JSON.stringify(Object.fromEntries(t.parts.map((p,i)=>[p.id,t.control==='multi'?g.accepted:Array.isArray(g.accepted[0])?g.accepted[i][0]:g.accepted[0]])));
}
test('compact Unit 1 has five 12-practice lessons, a single unit exam, and one task per window',()=>{
 assert.deepEqual(unit1.map(l=>tasksOf(l).length),[12,12,12,12,12,20]);
 assert.deepEqual(unit1.map(l=>l.kind),['practice','practice','practice','practice','practice','exam']);
 for(const l of unit1){
  assert.equal(l.flow,'windows');assert.equal(l.automatic,true);assert.equal(l.version,'2026-10-19.4');
  assert(l.sections.every(s=>s.items.filter(i=>i.kind==='task').length<=1));
  for(const t of tasksOf(l)){
   const key=(unit1Keys[l.id as keyof typeof unit1Keys].tasks as Record<string,GradingRule>)[t.id];
   assert.equal(key.mode,'authored');assert('binary'in key&&key.binary);assert(!('rubric'in key)||!key.rubric);
  }
 }
 assert.equal(unit1.flatMap(l=>l.images).length,8);assert.equal(tasksOf(unit1[5]).reduce((sum,t)=>sum+t.maxPoints,0),24);
 assert.equal(unit1[0].vocabulary.length,14);
});
test('all new answers have binary automatic grades; full forms and ordinary contractions are accepted',()=>{
 for(const l of unit1)for(const t of tasksOf(l)){
  const g=(unit1Keys[l.id as keyof typeof unit1Keys].tasks as Record<string,GradingRule>)[t.id] as AuthoredRule;
  const value=t.control==='multi'?g.accepted:Array.isArray(g.accepted[0])?g.accepted[0][0]:g.accepted[0];
  const correct=JSON.stringify({[t.parts[0].id]:value});
  assert.equal(grade(g,correct,t.maxPoints).earnedPoints,t.maxPoints,t.id);
  const wrong=grade(g,JSON.stringify({[t.parts[0].id]:'unrecognised synthetic sentence'}),t.maxPoints);
  assert.equal(wrong.reviewStatus,'graded');assert.equal(wrong.earnedPoints,0);
 }
 assert.equal(isCompleted({mode:'practice'},11,12,false,true),false);
 assert.equal(isCompleted({mode:'practice'},12,12,false,false),false);
 assert.equal(isCompleted({mode:'practice'},12,12,false,true),true);
});
test('real PostgreSQL: atomic answer/check, all-correct automatic completion, retries, saved place and one final exam',async()=>{
 const cluster=await testDatabase(),{db}=cluster;
 try{
  await publishUnit1(db);await publishUnit1(db);
  assert.equal((await db.select({n:sql<number>`count(*)::int`}).from(questions))[0].n,80);
  const s=await createStudent(db,'Compact Unit Test Student'),other=await createStudent(db,'Compact Other Student');
  const first=stableUuid(unit1[0].id);
  await assert.rejects(startAttempt(db,s.id,first),{code:'VOCABULARY_REQUIRED'});
  await assert.rejects(startAttempt(db,s.id,stableUuid(unit1[5].id)),{code:'LESSONS_REQUIRED'});

  for(const [index,l]of unit1.slice(0,5).entries()){
   const lessonId=stableUuid(l.id),versionId=stableUuid(l.id+'@'+l.version);
   await recordVocabularyResult(db,s.id,lessonId,versionId,'compact-vocab:'+index,3,4);
   const a=await startAttempt(db,s.id,lessonId);
   let queries=0;
   const counted=new Proxy(db,{get(target,key){const value=Reflect.get(target,key);if(key==='execute'||key==='select')return (...args:unknown[])=>{queries++;return value.apply(target,args);};return typeof value==='function'?value.bind(target):value;}}) as Database;
   const loaded=await loadAttempt(counted,s.id,a.id);assert.equal(queries,2);assert(!JSON.stringify(loaded).includes('accepted'));
   queries=0;await homeData(counted,s.id);assert.equal(queries,2);
   await assert.rejects(loadAttempt(db,other.id,a.id),{code:'ATTEMPT_NOT_FOUND'});
   await studyAction(db,s.id,a.id,{action:'navigate',sectionId:l.sections[1].id,panels:{},revision:0});
   assert.equal((await loadAttempt(db,s.id,a.id)).workspace?.sectionId,l.sections[1].id);
   const qs=await db.select().from(questions).where(eq(questions.versionId,versionId)).orderBy(questions.position);
   const firstQ=qs[0],bad=JSON.stringify({[firstQ.content.task!.parts[0].id]:firstQ.content.task!.options?.find(o=>o.id!==(firstQ.grading as AuthoredRule).accepted[0])?.id??'wrong'});
   const wrong=await checkPractice(db,s.id,a.id,{questionId:firstQ.id,response:bad,expectedRevision:0,requestId:randomUUID()});
   assert.equal(wrong.earnedPoints,0);assert.equal(wrong.reviewStatus,'graded');
   for(const q of qs.slice(1))await checkPractice(db,s.id,a.id,{questionId:q.id,response:correctResponse(q),expectedRevision:0,requestId:randomUUID()});
   assert.equal((await loadAttempt(db,s.id,a.id)).status,'in_progress');
   await assert.rejects(submitAttempt(db,s.id,a.id),{code:'PRACTICE_INCOMPLETE'});
   const request={questionId:firstQ.id,response:correctResponse(firstQ),expectedRevision:wrong.answerRevision,requestId:randomUUID()};
   const [completed,retry]=await Promise.all([checkPractice(db,s.id,a.id,request),checkPractice(db,s.id,a.id,request)]);
   assert.equal(completed.attempt.status,'submitted');assert.equal(retry.attempt.status,'submitted');
   assert.equal(completed.coinsAwarded+retry.coinsAwarded,50);
   await assert.rejects(checkPractice(db,s.id,a.id,{questionId:firstQ.id,response:bad,expectedRevision:0,requestId:wrong.id}),{code:'STALE_ANSWER'});
   assert.equal((await submitAttempt(db,s.id,a.id)).pendingReview,false);
  }
  assert.equal((await db.select().from(lessonProgress).where(eq(lessonProgress.studentId,s.id))).length,5);
  assert.equal((await homeData(db,s.id)).totalPoints,400);
  const exam=unit1[5],a=await startAttempt(db,s.id,stableUuid(exam.id));
  await assert.rejects(studyAction(db,s.id,a.id,{action:'transcript',requestId:randomUUID()}));
  const play=randomUUID();await studyAction(db,s.id,a.id,{action:'play',requestId:play});await studyAction(db,s.id,a.id,{action:'play',requestId:randomUUID()});
  await assert.rejects(studyAction(db,s.id,a.id,{action:'play',requestId:randomUUID()}),{code:'PLAY_LIMIT'});
  await studyAction(db,s.id,a.id,{action:'audio-complete',playId:play,requestId:randomUUID()});
  const qs=await db.select().from(questions).where(eq(questions.versionId,stableUuid(exam.id+'@'+exam.version)));
  for(const q of qs)await saveAnswer(db,s.id,a.id,{questionId:q.id,response:correctResponse(q),expectedRevision:0});
  const hidden=await loadAttempt(db,s.id,a.id);assert(hidden.questions.every(q=>q.feedback===null));
  await assert.rejects(checkPractice(db,s.id,a.id,{questionId:qs[0].id,revision:1,requestId:randomUUID()}),{code:'NO_PRACTICE'});
  const result=await submitAttempt(db,s.id,a.id);assert.equal(result.earnedPoints,24);assert.equal(result.pendingReview,false);
  assert.equal((await homeData(db,s.id)).totalPoints,450);assert((await homeData(db,s.id)).units[0].mastered);
  const failed=await startAttempt(db,s.id,stableUuid(exam.id));await studyAction(db,s.id,failed.id,{action:'audio-failed',requestId:randomUUID()});
  const failure=await submitAttempt(db,s.id,failed.id);assert.equal(failure.pendingReview,false);assert.equal(failure.earnedPoints,0);
  assert.equal((await homeData(db,s.id)).totalPoints,450);
  assert.equal((await db.select().from(learningRewards).where(eq(learningRewards.studentId,s.id))).length,15);
  await assert.rejects(db.delete(practiceChecks).where(eq(practiceChecks.studentId,s.id)));
  assert((await publishedCatalog(db))[0].lessons.every(l=>l.taskCount===(l.kind==='lesson'?12:20)));
 }finally{await cluster.close();}
});
