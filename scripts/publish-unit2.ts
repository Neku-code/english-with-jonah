import { connectDatabase } from '../src/lib/server/db/connect';
import { unit2, unit2Keys, unit2Id } from '../src/lib/server/learning/unit2';
import { publishCurriculum } from './publish-curriculum';

export const publishUnit2 = (db: ReturnType<typeof connectDatabase>['db']) =>
  publishCurriculum(db, { id: unit2Id, title: 'Unit 2 · Present Simple', position: 2, content: unit2, keys: unit2Keys });

if (process.argv[1]?.replaceAll('\\','/').endsWith('/publish-unit2.ts')) {
  await import('./env.mjs');
  const { db, pool } = connectDatabase(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '');
  try { await publishUnit2(db); console.log('Published Unit 2: 5 lessons, 60 vocabulary entries, 60 practices and a 20-question final exam.'); }
  catch { console.error('Unit 2 publication failed. Check private DB configuration and content version.'); process.exitCode = 1; }
  finally { await pool.end(); }
}
