import test from 'node:test';
import assert from 'node:assert/strict';
import {eq} from 'drizzle-orm';
import {testDatabase} from './database';
import {fixture} from './fixtures';
import {createStudent} from '../src/lib/server/students';
import {startAttempt,saveAnswers,loadAttempt} from '../src/lib/server/learning/attempts';
import {questions,lessons,lessonVersions} from '../src/lib/server/db/schema';

test('batch saves are atomic, revision checked, retry safe and student owned',async()=>{
 const store=await testDatabase(),{db}=store;
 try{
  const s=await createStudent(db,'Batch answer learner'),other=await createStudent(db,'Batch other learner'),f=await fixture(db,{published:false});
  const [second]=await db.insert(questions).values({versionId:f.version.id,exerciseType:'text',position:2,maxPoints:10,content:{prompt:'Second synthetic token'},grading:f.question.grading}).returning();
  await db.update(lessons).set({status:'published'}).where(eq(lessons.id,f.lesson.id));await db.update(lessonVersions).set({publishedAt:new Date()}).where(eq(lessonVersions.id,f.version.id));
  const a=await startAttempt(db,s.id,f.lesson.id),batch=[f.question,second].map(q=>({questionId:q.id,response:'token',expectedRevision:0}));
  const saved=await saveAnswers(db,s.id,a.id,batch);assert.equal(saved.saved.length,2);assert.deepEqual(await saveAnswers(db,s.id,a.id,batch),saved);
  await assert.rejects(saveAnswers(db,s.id,a.id,[{questionId:f.question.id,response:'new first',expectedRevision:1},{questionId:second.id,response:'stale second',expectedRevision:0}]),{code:'STALE_ANSWER'});
  const unchanged=await loadAttempt(db,s.id,a.id);assert(unchanged.answers.every(answer=>answer.response==='token'&&answer.revision===1));
  await assert.rejects(saveAnswers(db,other.id,a.id,batch),{code:'ATTEMPT_NOT_FOUND'});
  await assert.rejects(saveAnswers(db,s.id,a.id,[batch[0],batch[0]]),{code:'INVALID_ANSWERS'});
  await assert.rejects(saveAnswers(db,s.id,a.id,[null] as never),{code:'INVALID_ANSWERS'});
 }finally{await store.close();}
});
