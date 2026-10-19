import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq,sql} from 'drizzle-orm';
import {unit1,stableUuid,unit1Keys} from '../src/lib/server/learning/unit1';
import {tasksOf} from '../src/lib/learning/types';
import {grade} from '../src/lib/server/learning/grading';
import type {GradingRule} from '../src/lib/server/learning/contracts';
import {testDatabase} from './database';
import {publishUnit1} from '../scripts/publish-unit1';
import {createStudent} from '../src/lib/server/students';
import {startAttempt,loadAttempt,saveAnswer,submitAttempt,recordVocabularyResult} from '../src/lib/server/learning/attempts';
import {studyAction,checkPractice,vocabularyAction} from '../src/lib/server/learning/study';
import {questions,lessonVersions,practiceChecks,lessonProgress,answers} from '../src/lib/server/db/schema';
import {createTeacherSession} from '../src/lib/server/teacher-sessions';
import {saveReview} from '../src/lib/server/admin/reviews';
import {attemptDetail,reviewQueue} from '../src/lib/server/admin/data';
import {homeData} from '../src/lib/server/learning/catalog';
import type {AuthoredRule} from '../src/lib/server/learning/authored-grading';
const key=(l:number,q:number)=>unit1Keys[`u1-l1.${l}` as keyof typeof unit1Keys].tasks[`u1-l1.${l}-q${q}` as never] as unknown as GradingRule;
const response=(l:number,q:number,value:unknown)=>JSON.stringify({[`u1-l1.${l}-q${q}-part1`]:value});
test('Unit 1 authored inventory preserves 140 parents, stable unique IDs, images, subparts and exam weights',()=>{
 assert.deepEqual(unit1.map(l=>tasksOf(l).length),[24,24,24,24,24,20]);
 const ids:string[]=[];
 for(const l of unit1){ids.push(l.id,...l.sections.map(s=>s.id));for(const s of l.sections)for(const i of s.items){ids.push(i.id);if(i.kind==='task'){ids.push(...i.parts.map(p=>p.id),...(i.tokens??[]).map(t=>t.id));assert(!i.prompt.includes('[RASM:'));}}for(const img of l.images){ids.push(img.id,...img.panels.map(p=>p.id));for(const p of img.panels){assert.equal(p.width,p.bounds[2]-p.bounds[0]);assert.equal(p.height,p.bounds[3]-p.bounds[1]);}}}
 assert.equal(ids.length,new Set(ids).size);assert.equal(unit1.flatMap(l=>l.images).length,8);
 assert.equal(unit1.flatMap(l=>l.images.flatMap(i=>i.panels)).length,28);
 assert.equal(tasksOf(unit1[5]).reduce((a,q)=>a+q.maxPoints,0),24);
 assert.equal(tasksOf(unit1[2])[3].control,'multi');
 assert.equal(unit1[0].vocabulary.length,14);assert(unit1.every(l=>l.vocabulary.every(v=>!['LUG‘AT','TAKRORLASH'].includes(v.english))));
 assert.equal(tasksOf(unit1[3])[22].parts.length,3);assert.equal(tasksOf(unit1[3])[23].parts.length,4);
 assert(unit1[1].images[1].panels.every(p=>p.label.length>1));assert(unit1[5].images.every(i=>!i.models.length&&i.panels.every(p=>!p.model)));
});
test('authored alternatives, strict full/short forms, multi-select, personal answers and rubric partial credit',()=>{
 assert.equal(grade(key(1,16),response(1,16,'  HE’S a student! '),1).earnedPoints,1);
 assert.equal(grade(key(1,15),response(1,15,'They are students.'),1).earnedPoints,null);
 assert.equal(grade(key(3,4),response(3,4,['A','B']),1).earnedPoints,1);
 assert.equal(grade(key(3,4),response(3,4,['A']),1).earnedPoints,0);
 assert.equal(grade(key(3,4),response(3,4,['A','B','C']),1).earnedPoints,0);
 assert.equal(grade(key(3,4),response(3,4,['A','A']),1).earnedPoints,0);
 assert.equal(grade(key(4,22),response(4,22,"Yes, I'm."),1).earnedPoints,0);
 assert.equal(grade(key(1,21),response(1,21,"I'm Dilshod."),1).reviewStatus,'pending');
 for(const [q,v] of [[17,'I’m not tired!'],[18,'THE PHONE IS ON THE DESK'],[19,'where are you from'],[20,'YES WE ARE']] as const)assert.equal(grade(key(6,q),response(6,q,v),2).earnedPoints,2);
 for(const [q,v] of [[17,'I not tired'],[18,'phone on desk'],[19,'Where you from'],[20,'Yes we']] as const)assert.equal(grade(key(6,q),response(6,q,v),2).earnedPoints,1);
 assert.equal(grade(key(6,18),response(6,18,'The telephone rests upon the table.'),2).reviewStatus,'pending');
});
test('real PostgreSQL: vocabulary readiness, retries, ownership, saved place, review, exam24, two plays and immutable progress',async()=>{
 const cluster=await testDatabase();const {db}=cluster;
 try{
  await publishUnit1(db);await publishUnit1(db);
  const [count]=await db.select({n:sql<number>`count(*)::int`}).from(questions);assert.equal(count.n,140);
  const s=await createStudent(db,'Unit One Test Student','Isolated'),other=await createStudent(db,'Unit One Other Student','Isolated');
  const teacher=await createTeacherSession(db);
  const first=stableUuid(unit1[0].id);
  await assert.rejects(startAttempt(db,s.id,first),/lug‘at/);
  const vs=await vocabularyAction(db,s.id,first,{action:'start'}) as {id:string;words:{id:string;english:string}[]};
  assert.equal(vs.words.length,Math.ceil(unit1[0].vocabulary.length/3));
  assert(!JSON.stringify(vs).includes('accepted'));
  const {vocabularyItems}=await import('../src/lib/server/db/schema');
  for(const w of vs.words){const [word]=await db.select().from(vocabularyItems).where(eq(vocabularyItems.id,w.id));const input={action:'answer',sessionId:vs.id,wordId:w.id,response:word.acceptedTranslations[0]};const r=await vocabularyAction(db,s.id,first,input);assert.equal('correct' in r&&r.correct,true);await vocabularyAction(db,s.id,first,input);}
  const attempts:string[]=[];
  for(const [index,l] of unit1.slice(0,5).entries()){
   const lessonId=stableUuid(l.id),versionId=stableUuid(l.id+'@'+l.version);
   if(index)await recordVocabularyResult(db,s.id,lessonId,versionId,'test-ready:'+index,1,1);
   const a=await startAttempt(db,s.id,lessonId);attempts.push(a.id);
   assert.equal((await startAttempt(db,s.id,lessonId)).id,a.id);
   const loaded=await loadAttempt(db,s.id,a.id);assert(!JSON.stringify(loaded).includes('accepted'));
   await assert.rejects(loadAttempt(db,other.id,a.id));
   const nav={action:'navigate',sectionId:l.sections[1].id,panels:{},revision:0};await studyAction(db,s.id,a.id,nav);await studyAction(db,s.id,a.id,nav);
   assert.equal((await loadAttempt(db,s.id,a.id)).workspace?.sectionId,l.sections[1].id);
   const playId=randomUUID();await studyAction(db,s.id,a.id,{action:'play',requestId:playId});await studyAction(db,s.id,a.id,{action:'audio-complete',requestId:randomUUID(),playId});
   await studyAction(db,s.id,a.id,{action:'transcript',requestId:randomUUID()});
   const qs=await db.select().from(questions).where(eq(questions.versionId,versionId));
   for(const q of qs){const t=q.content.task!;const g=q.grading;const values:Record<string,unknown>={};
    for(const [i,p]of t.parts.entries())values[p.id]=g.mode==='manual'?"I'm a student.":g.mode==='authored'?(t.control==='multi'?g.accepted:Array.isArray(g.accepted[0])?(g.accepted[i]as string[])[0]:g.accepted[0]):'';
    let rev=0;
    if(index===0&&t.number===1){const bad=response(1,1,'A');const r=await saveAnswer(db,s.id,a.id,{questionId:q.id,response:bad,expectedRevision:0});await checkPractice(db,s.id,a.id,{questionId:q.id,revision:r.revision,requestId:randomUUID()});rev=r.revision;}
    const input={questionId:q.id,response:JSON.stringify(values),expectedRevision:rev};const r=await saveAnswer(db,s.id,a.id,input);assert.equal((await saveAnswer(db,s.id,a.id,input)).revision,r.revision);
    const c=await checkPractice(db,s.id,a.id,{questionId:q.id,revision:r.revision,requestId:randomUUID()});const c2=await checkPractice(db,s.id,a.id,{questionId:q.id,revision:r.revision,requestId:randomUUID()});assert.equal(c.id,c2.id);
   }
   const submitted=await submitAttempt(db,s.id,a.id);assert(submitted.pendingReview);assert.equal((await submitAttempt(db,s.id,a.id)).id,a.id);
   for(const q of qs.filter(q=>q.grading.mode==='manual'))await saveReview(db,teacher.id,a.id,q.id,{requestId:randomUUID(),expectedRevision:'0',feedback:'Tekshirildi',points:String(q.maxPoints)});
  }
  const progress=await db.select().from(lessonProgress).where(eq(lessonProgress.studentId,s.id));assert.equal(progress.length,5);
  const detail=await attemptDetail(db,attempts[0]);assert.equal(detail.checks.length,25);assert.equal(detail.support?.transcriptUsed,true);assert(detail.questions.some(q=>q.response?.includes("I'm a student.")));
  const qqueue=await reviewQueue(db,new URL('http://localhost/admin/reviews'));assert.equal(qqueue.total,0);
  const exam=unit1[5],examId=stableUuid(exam.id),a=await startAttempt(db,s.id,examId);
  await assert.rejects(studyAction(db,s.id,a.id,{action:'transcript',requestId:randomUUID()}));
  const play=randomUUID();await studyAction(db,s.id,a.id,{action:'play',requestId:play});await studyAction(db,s.id,a.id,{action:'play',requestId:play});await studyAction(db,s.id,a.id,{action:'play',requestId:randomUUID()});
  assert.equal((await loadAttempt(db,s.id,a.id)).workspace?.audioPlays,2);await assert.rejects(studyAction(db,s.id,a.id,{action:'play',requestId:randomUUID()}));
  await studyAction(db,s.id,a.id,{action:'audio-complete',playId:play,requestId:randomUUID()});
  const qs=await db.select().from(questions).where(eq(questions.versionId,a.id?stableUuid(exam.id+'@'+exam.version):''));
  for(const q of qs){const g=q.grading as AuthoredRule;await saveAnswer(db,s.id,a.id,{questionId:q.id,response:JSON.stringify({[g.partIds[0]]:g.accepted[0]}),expectedRevision:0});}
  const hidden=await loadAttempt(db,s.id,a.id);assert(hidden.questions.every(q=>q.feedback===null));assert(hidden.answers.every(a=>a.earnedPoints===null));
  await assert.rejects(checkPractice(db,s.id,a.id,{questionId:qs[0].id,revision:1,requestId:randomUUID()}));
  const result=await submitAttempt(db,s.id,a.id);assert.equal(result.earnedPoints,24);assert.equal(result.maxPoints,24);assert.equal(result.pendingReview,false);
  assert((await homeData(db,s.id)).units[0].mastered);assert.equal((await homeData(db,s.id)).totalPoints,450);
  const failed=await startAttempt(db,s.id,examId);await studyAction(db,s.id,failed.id,{action:'audio-failed',requestId:randomUUID()});const provisional=await submitAttempt(db,s.id,failed.id);assert(provisional.pendingReview);assert.equal(provisional.maxPoints,24);assert((await homeData(db,s.id)).units[0].mastered);assert.equal((await homeData(db,s.id)).totalPoints,450);
  await assert.rejects(db.delete(practiceChecks).where(eq(practiceChecks.attemptId,attempts[0])));
 }finally{await cluster.close();}
});
