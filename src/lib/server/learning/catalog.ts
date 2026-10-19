import {coinBalance} from '../../coins';
import { sql } from 'drizzle-orm';
import type { Connection } from '../db/connect';

type CatalogLesson = { id:string;unitId:string;kind:'lesson'|'final_exam';position:number;versionId:string;version:number;title:string;vocabularyRequired:boolean;taskCount:number };
export async function publishedCatalog(db: Connection) {
 const {rows}=await db.execute<{unitId:string;unitTitle:string;unitPosition:number;lesson:CatalogLesson|null}>(sql`
  SELECT u.id AS "unitId",u.title AS "unitTitle",u.position AS "unitPosition",to_jsonb(l) AS lesson
  FROM units u LEFT JOIN LATERAL (
   SELECT l.id,l.unit_id AS "unitId",l.kind,l.position,v.id AS "versionId",v.version,v.title,v.vocabulary_required AS "vocabularyRequired",
     (SELECT count(*)::int FROM questions q WHERE q.version_id=v.id) AS "taskCount"
   FROM lessons l JOIN LATERAL (
    SELECT * FROM lesson_versions v WHERE v.lesson_id=l.id AND v.published_at<=now() ORDER BY v.version DESC LIMIT 1
   ) v ON true WHERE l.unit_id=u.id AND l.status='published' ORDER BY l.position
  ) l ON true WHERE u.status='published' ORDER BY u.position,l.position`);
 const units=new Map<string,{id:string;title:string;position:number;lessons:CatalogLesson[]}>();
 for(const row of rows){let unit=units.get(row.unitId);if(!unit){unit={id:row.unitId,title:row.unitTitle,position:row.unitPosition,lessons:[]};units.set(row.unitId,unit);}if(row.lesson)unit.lessons.push(row.lesson);}
 return [...units.values()];
}

type Activity={id:string;lessonId:string;versionId:string;status:'in_progress'|'submitted';updatedAt:string;earnedPoints:number|null;maxPoints:number|null;pendingReview:boolean;title:string};
export async function homeData(db: Connection, studentId: string) {
 // Two independent round trips instead of seven sequential reads. No global
 // student cache: profile switches, archived users and new content stay current.
 const [catalog,{rows:[state]}]=await Promise.all([publishedCatalog(db),db.execute<{
  completed:string[];passed:string[];studied:string[];rewards:{lessonId:string;coins:number}[];activity:Activity[];adjusted:string
 }>(sql`SELECT
  ARRAY(SELECT lesson_id FROM lesson_progress WHERE student_id=${studentId}) AS completed,
  ARRAY(SELECT version_id FROM vocabulary_readiness WHERE student_id=${studentId}) AS passed,
  ARRAY(SELECT version_id FROM vocabulary_study WHERE student_id=${studentId}) AS studied,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('lessonId',lesson_id,'coins',coins)) FROM learning_rewards WHERE student_id=${studentId}),'[]'::jsonb) AS rewards,
  COALESCE((SELECT jsonb_agg(a ORDER BY a."updatedAt" DESC) FROM (
   SELECT a.id,a.lesson_id AS "lessonId",a.version_id AS "versionId",a.status,a.updated_at AS "updatedAt",a.earned_points AS "earnedPoints",a.max_points AS "maxPoints",a.pending_review AS "pendingReview",v.title
   FROM lesson_attempts a JOIN lesson_versions v ON v.id=a.version_id WHERE a.student_id=${studentId}
  ) a),'[]'::jsonb) AS activity,
  COALESCE((SELECT sum(delta) FROM coin_adjustments WHERE student_id=${studentId}),0)::text AS adjusted`)]);
 const {rewards,activity}=state,complete=new Set(state.completed),passed=new Set(state.passed),ready=new Set([...state.passed,...state.studied]);
 const visible=new Set(catalog.flatMap(u=>u.lessons.map(l=>l.id)));
 const versions=new Set(catalog.flatMap(u=>u.lessons.map(l=>l.versionId)));
 const active=activity.filter(a=>visible.has(a.lessonId));
 const resume=active.find(a=>a.status==='in_progress'&&versions.has(a.versionId));
 const data=catalog.map(unit=>{
  const regular=unit.lessons.filter(l=>l.kind==='lesson'),finished=regular.filter(l=>complete.has(l.id)).length;
  const exam=unit.lessons.find(l=>l.kind==='final_exam');
  const examResults=exam?active.filter(a=>a.lessonId===exam.id&&a.status==='submitted'):[];
  const mastered=regular.length>0&&finished===regular.length&&examResults.some(a=>!a.pendingReview&&a.maxPoints&&a.earnedPoints!==null&&100*a.earnedPoints>=90*a.maxPoints);
  return {...unit,finished,total:regular.length,mastered,
   points:rewards.filter(r=>unit.lessons.some(l=>l.id===r.lessonId)).reduce((sum,r)=>sum+r.coins,0),
   maximumPoints:regular.reduce((sum,l)=>sum+60+(l.vocabularyRequired?30:0),0),
   examResult:examResults[0]?{earnedPoints:examResults[0].earnedPoints,maxPoints:examResults[0].maxPoints,pendingReview:examResults[0].pendingReview}:null,
   lessons:unit.lessons.map(lesson=>({...lesson,
    mastered:lesson.kind==='final_exam'?mastered:mastered&&complete.has(lesson.id),vocabularyMastered:passed.has(lesson.versionId),
    coins:rewards.filter(r=>r.lessonId===lesson.id).reduce((sum,r)=>sum+r.coins,0),
    completed:lesson.kind==='final_exam'?mastered:complete.has(lesson.id),
    inProgress:active.some(a=>a.lessonId===lesson.id&&a.versionId===lesson.versionId&&a.status==='in_progress'),
    needsVocabulary:lesson.vocabularyRequired&&!ready.has(lesson.versionId),
    needsLessons:lesson.kind==='final_exam'&&(regular.length===0||finished<regular.length),href:`/learn/${lesson.id}`
   }))};
 });
 const first=data.flatMap(u=>u.lessons).find(l=>!l.completed&&!l.needsLessons);
 return {units:data,lessonCount:visible.size,totalPoints:coinBalance(BigInt(rewards.reduce((sum,r)=>sum+r.coins,0))+BigInt(state.adjusted)),
  primary:resume?{label:'Davom ettirish',title:resume.title,href:`/learn/${resume.lessonId}?attempt=${resume.id}`}
   :first?{label:first.needsVocabulary?'Lug‘atni ko‘rish':'Boshlash',title:first.title,href:first.href}:null,
  recent:active.slice(0,3).map(a=>({id:a.id,title:a.title,status:a.status,updatedAt:new Date(a.updatedAt).toISOString(),pendingReview:a.pendingReview,earnedPoints:a.earnedPoints,maxPoints:a.maxPoints}))};
}
