import './env.mjs';
import {connectDatabase} from '../src/lib/server/db/connect';
import {publishedCatalog} from '../src/lib/server/learning/catalog';
import {unit1Id} from '../src/lib/server/learning/unit1';
const {db,pool}=connectDatabase(process.env.DATABASE_URL||'');
try {
 const catalog=await publishedCatalog(db),unit=catalog.find(u=>u.id===unit1Id);
 if(!unit||unit.lessons.length!==6)throw new Error('Missing curriculum');
 const result=await pool.query(`SELECT count(*)::int tasks,sum(q.max_points) FILTER(WHERE l.kind='final_exam')::int exam_points FROM questions q JOIN lesson_versions v ON v.id=q.version_id JOIN lessons l ON l.id=v.lesson_id WHERE q.version_id=ANY($1::uuid[])`,[unit.lessons.map(l=>l.versionId)]);
 if(result.rows[0].tasks!==140||result.rows[0].exam_points!==24)throw new Error('Incorrect curriculum totals');
 const synthetic=await pool.query('SELECT count(*)::int count FROM students WHERE display_name=ANY($1::text[])',[['Unit One Browser QA','Unit One Exam QA','Unit One Test Student','Unit One Other Student']]);
 console.log(JSON.stringify({publishedLessons:6,numberedTasks:140,examPoints:24,unit1QaStudents:synthetic.rows[0].count}));
}catch{console.error('Unit 1 verification failed; check the intended private database configuration.');process.exitCode=1;}finally{await pool.end();}
