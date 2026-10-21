import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {readFile} from 'node:fs/promises';
import {unit2,unit2Keys} from '../src/lib/server/learning/unit2';
import {stableUuid} from '../src/lib/server/learning/unit1';
import {tasksOf} from '../src/lib/learning/types';
import {grade} from '../src/lib/server/learning/grading';
import {nextRankGap} from '../src/lib/learning/ranking';
import type {GradingRule} from '../src/lib/server/learning/contracts';
import type {AuthoredRule} from '../src/lib/server/learning/authored-grading';
import {testDatabase} from './database';
import {publishUnit1} from '../scripts/publish-unit1';
import {publishUnit2} from '../scripts/publish-unit2';
import {createStudent} from '../src/lib/server/students';
import {startAttempt,loadAttempt,saveAnswers,submitAttempt} from '../src/lib/server/learning/attempts';
import {vocabularyAction,checkPractice,studyAction} from '../src/lib/server/learning/study';
import {homeData} from '../src/lib/server/learning/catalog';
import {rankings} from '../src/lib/server/learning/rewards';
import {questions,vocabularyItems,lessonVersions} from '../src/lib/server/db/schema';

const response=(q:typeof questions.$inferSelect)=>{
 const g=q.grading as AuthoredRule;
 return JSON.stringify({[g.partIds[0]]:g.accepted[0]});
};
test('Present Simple has complete original lessons, valid assets and strict automatic answers',async()=>{
 assert.deepEqual(unit2.map(l=>tasksOf(l).length),[12,12,12,12,12,20]);
 assert.deepEqual(unit2.map(l=>l.vocabulary.length),[12,12,12,12,12,0]);
 const ids=new Set<string>();
 for(const lesson of unit2){
  const keys=unit2Keys[lesson.id as keyof typeof unit2Keys];
  assert.equal(lesson.flow,'windows');assert(lesson.sections.every(s=>s.items.filter(i=>i.kind==='task').length<=1));
  for(const image of lesson.images)for(const v of image.variants)assert((await readFile('static'+v.url)).length>0);
  for(const task of tasksOf(lesson)){
   assert(!ids.has(task.id));ids.add(task.id);
   const rule=(keys.tasks as Record<string,GradingRule>)[task.id] as AuthoredRule;
   assert.equal(rule.binary,true);assert.equal(rule.rubric,null);
   for(const answer of rule.accepted){
    const result=grade(rule,JSON.stringify({[task.parts[0].id]:answer}),task.maxPoints);
    assert.equal(result.earnedPoints,task.maxPoints,task.id);assert.equal(result.reviewStatus,'graded');
   }
   assert.equal(grade(rule,JSON.stringify({[task.parts[0].id]:'incorrect synthetic answer'}),1).earnedPoints,0);
   if(task.control==='order')assert.deepEqual(task.tokens!.map(t=>t.label.toLowerCase()).sort(),String(rule.accepted[0]).replace(/[.?!]/g,'').toLowerCase().split(' ').sort());
  }
 }
 const key=unit2Keys['u2-l3'].tasks['u2-l3-q12'] as AuthoredRule;
 assert.equal(grade(key,JSON.stringify({[key.partIds[0]]:"She doesn't watches TV."}),1).earnedPoints,0);
 assert.equal(grade(key,JSON.stringify({[key.partIds[0]]:'She does not watch TV.'}),1).earnedPoints,1);
});
test('ranking targets handle shared ranks, negative adjustments and exact large balances',()=>{
 assert.equal(nextRankGap([]),null);
 assert.equal(nextRankGap([{points:0,rank:1,isCurrent:true},{points:0,rank:1,isCurrent:false}]),null);
 assert.deepEqual(nextRankGap([{points:100,rank:1,isCurrent:false},{points:50,rank:2,isCurrent:false},{points:50,rank:2,isCurrent:false},{points:-10,rank:3,isCurrent:true}]),{rank:2,coins:60});
 assert.deepEqual(nextRankGap([{points:'90071992547409931234',rank:1,isCurrent:false},{points:'90071992547409931230',rank:2,isCurrent:true}]),{rank:1,coins:4});
});
test('Unit 2 publishes idempotently; vocabulary, lessons, exam and coins stay separate from Unit 1',async()=>{
 const cluster=await testDatabase(),{db}=cluster;
 try{
  await publishUnit1(db);await publishUnit2(db);await publishUnit2(db);
  assert.equal((await db.select().from(lessonVersions)).length,12);
  const student=await createStudent(db,'Present Simple Test');
  let home=await homeData(db,student.id);
  assert.equal(home.units.length,2);assert.equal(home.units[1].maximumPoints,450);
  await assert.rejects(startAttempt(db,student.id,stableUuid('u2-l6')),{code:'LESSONS_REQUIRED'});
  for(const lesson of unit2.slice(0,5)){
   const id=stableUuid(lesson.id);
   await assert.rejects(startAttempt(db,student.id,id),{code:'VOCABULARY_REQUIRED'});
   const session=await vocabularyAction(db,student.id,id,{action:'start'});
   assert('words'in session);assert.equal(session.words!.length,4);
   const words=await db.select().from(vocabularyItems).where(eq(vocabularyItems.versionId,stableUuid(lesson.id+'@'+lesson.version)));
   for(const word of session.words!){
    const answer=words.find(w=>w.id===word.id)!.acceptedTranslations[0];
    const input={action:'answer',sessionId:session.id,wordId:word.id,response:answer};
    const checked=await vocabularyAction(db,student.id,id,input);assert('correct'in checked&&checked.correct);
    const replay=await vocabularyAction(db,student.id,id,input);assert('coinsAwarded'in replay);assert.equal(replay.coinsAwarded,0);
   }
   const a=await startAttempt(db,student.id,id);
   const play=await studyAction(db,student.id,a.id,{action:'play',requestId:randomUUID()});assert('turns'in play&&Array.isArray(play.turns));
   const qs=await db.select().from(questions).where(eq(questions.versionId,stableUuid(lesson.id+'@'+lesson.version))).orderBy(questions.position);
   for(const q of qs)await checkPractice(db,student.id,a.id,{questionId:q.id,response:response(q),expectedRevision:0,requestId:randomUUID()});
   assert.equal((await loadAttempt(db,student.id,a.id)).status,'submitted');
   await submitAttempt(db,student.id,a.id);
  }
  home=await homeData(db,student.id);assert.equal(home.totalPoints,400);assert.equal(home.units[0].finished,0);assert.equal(home.units[1].finished,5);
  const a=await startAttempt(db,student.id,stableUuid('u2-l6'));
  const qs=await db.select().from(questions).where(eq(questions.versionId,stableUuid('u2-l6@'+unit2[5].version))).orderBy(questions.position);
  await saveAnswers(db,student.id,a.id,qs.map(q=>({questionId:q.id,response:response(q),expectedRevision:0})));
  await assert.rejects(checkPractice(db,student.id,a.id,{questionId:qs[0].id,revision:1,requestId:randomUUID()}),{code:'NO_PRACTICE'});
  const hidden=await loadAttempt(db,student.id,a.id);assert(hidden.questions.every(q=>q.feedback===null));assert(!JSON.stringify(hidden).includes('accepted'));
  const result=await submitAttempt(db,student.id,a.id);assert.equal(result.earnedPoints,20);assert.equal(result.pendingReview,false);
  await submitAttempt(db,student.id,a.id);
  home=await homeData(db,student.id);assert.equal(home.totalPoints,450);assert.equal(home.units[0].mastered,false);assert.equal(home.units[1].mastered,true);
  assert.equal((await rankings(db,student.id)).find(r=>r.isCurrent)?.points,450);
 }finally{await cluster.close();}
});
