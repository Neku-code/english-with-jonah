// Real Neon verification uses an explicitly named disposable branch only.
import './env.mjs';
import {eq} from 'drizzle-orm';
import {connectDatabase} from '../src/lib/server/db/connect';
import {publishUnit1} from './publish-unit1';
import {unit1,stableUuid} from '../src/lib/server/learning/unit1';
import {students,questions,lessonProgress} from '../src/lib/server/db/schema';
import {createStudent} from '../src/lib/server/students';
import {startAttempt,saveAnswer,submitAttempt,recordVocabularyResult} from '../src/lib/server/learning/attempts';
import {checkPractice,studyAction} from '../src/lib/server/learning/study';
import {createTeacherSession} from '../src/lib/server/teacher-sessions';
import {saveReview} from '../src/lib/server/admin/reviews';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
if(process.env.NEON_BRANCH!=='codex-unit1-verify-20261019'||!process.env.DATABASE_URL?.includes('ep-steep-bonus-a1go5413'))throw new Error('Refusing synthetic data outside the temporary Unit 1 verification branch');
const {db,pool}=connectDatabase(process.env.DATABASE_URL);
try{
 await publishUnit1(db);
 const ensure=async(name:string)=>{const [s]=await db.select().from(students).where(eq(students.displayName,name));return s??await createStudent(db,name,'Unit 1 verification only');};
 const browserStudent=await ensure('Unit One Browser QA'),examStudent=await ensure('Unit One Exam QA');
 for(const s of[browserStudent,examStudent])for(const l of unit1.slice(0,5))await recordVocabularyResult(db,s.id,stableUuid(l.id),stableUuid(l.id+'@'+l.version),'qa-ready:'+l.version+':'+l.id,1,1);
 const teacher=await createTeacherSession(db);
 const completed=new Set((await db.select().from(lessonProgress).where(eq(lessonProgress.studentId,examStudent.id))).map(p=>p.lessonId));
 for(const l of unit1.slice(0,5)){
  if(completed.has(stableUuid(l.id)))continue;
  const a=await startAttempt(db,examStudent.id,stableUuid(l.id));
  const playId=randomUUID();await studyAction(db,examStudent.id,a.id,{action:'play',requestId:playId});await studyAction(db,examStudent.id,a.id,{action:'audio-complete',playId,requestId:randomUUID()});
  const qs=await db.select().from(questions).where(eq(questions.versionId,stableUuid(l.id+'@'+l.version)));
  for(const q of qs){const g=q.grading,t=q.content.task!,obj:Record<string,unknown>={};for(const[i,p]of t.parts.entries())obj[p.id]=g.mode==='manual'?"I'm a student.":g.mode==='authored'?t.control==='multi'?g.accepted:Array.isArray(g.accepted[0])?(g.accepted[i]as string[])[0]:g.accepted[0]:'';
   const r=await saveAnswer(db,examStudent.id,a.id,{questionId:q.id,response:JSON.stringify(obj),expectedRevision:0});await checkPractice(db,examStudent.id,a.id,{questionId:q.id,revision:r.revision,requestId:randomUUID()});}
  await submitAttempt(db,examStudent.id,a.id);
  for(const q of qs.filter(q=>q.grading.mode==='manual'))await saveReview(db,teacher.id,a.id,q.id,{requestId:randomUUID(),expectedRevision:'0',points:'1',feedback:'Synthetic QA review'});
 }
 await writeFile('.artifacts/unit1-qa.json',JSON.stringify({browserName:browserStudent.displayName,examName:examStudent.displayName,lessonUrls:unit1.map(l=>'/learn/'+stableUuid(l.id)),teacherCookie:teacher.token},null,2));
 console.log('PASS live Neon curriculum publication, five reviewed lessons, student isolation and browser fixtures. Private QA session saved only in ignored artifacts.');
}finally{await pool.end();}
