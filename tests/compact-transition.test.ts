import test from 'node:test';
import assert from 'node:assert/strict';
import {eq} from 'drizzle-orm';
import {testDatabase} from './database';
import {createStudent} from '../src/lib/server/students';
import {startAttempt,saveAnswer,loadAttempt} from '../src/lib/server/learning/attempts';
import {homeData} from '../src/lib/server/learning/catalog';
import {publishUnit1} from '../scripts/publish-unit1';
import {stableUuid,unit1,unit1Id} from '../src/lib/server/learning/unit1';
import {units,lessons,lessonVersions,questions,lessonAttempts} from '../src/lib/server/db/schema';

test('publishing compact lessons preserves old drafts and creates a separate latest attempt with its own vocabulary gate',async()=>{
 const store=await testDatabase(),{db}=store;
 try{
  const s=await createStudent(db,'Revision transition learner'),id=stableUuid(unit1[0].id),oldVersion=stableUuid(unit1[0].id+'@2026-10-19.3');
  await db.insert(units).values({id:unit1Id,title:'Unit 1 · To Be',position:1,status:'published'});
  await db.insert(lessons).values({id,unitId:unit1Id,position:1,kind:'lesson',status:'published'});
  await db.insert(lessonVersions).values({id:oldVersion,lessonId:id,version:1,title:'Original long lesson',completionPolicy:{mode:'all_answered'},vocabularyRequired:true});
  const [q]=await db.insert(questions).values({versionId:oldVersion,position:1,exerciseType:'written',content:{prompt:'Legacy personal answer'},grading:{mode:'manual'},maxPoints:1}).returning();
  await db.update(lessonVersions).set({publishedAt:new Date()}).where(eq(lessonVersions.id,oldVersion));
  const old=await startAttempt(db,s.id,id,{reviewVocabulary:true});
  await saveAnswer(db,s.id,old.id,{questionId:q.id,response:'Preserved original draft',expectedRevision:0});
  await publishUnit1(db);
  await assert.rejects(startAttempt(db,s.id,id),{code:'VOCABULARY_REQUIRED'});
  const current=await startAttempt(db,s.id,id,{reviewVocabulary:true});assert.notEqual(current.id,old.id);
  const history=await loadAttempt(db,s.id,old.id);assert.equal(history.answers[0].response,'Preserved original draft');
  const latest=await loadAttempt(db,s.id,current.id);assert.equal(latest.questions.length,12);assert(latest.questions.every(q=>q.exerciseType!=='written'));
  assert.equal((await db.select().from(lessonAttempts).where(eq(lessonAttempts.studentId,s.id))).length,2);
  assert((await homeData(db,s.id)).primary!.href.includes(current.id));
 }finally{await store.close();}
});
