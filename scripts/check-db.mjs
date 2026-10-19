import { databaseClient, databaseUrl } from './database.mjs';

try {
  databaseUrl();
} catch {
  console.error('Database is not configured. Add DATABASE_URL to .env.local, .env or the server environment.');
  process.exit(1);
}

const pool = databaseClient();
try {
  const { rows } = await pool.query("select to_regclass('public.students') as students, to_regclass('public.lesson_attempts') as attempts, to_regprocedure('protect_attempt()') as protections, to_regclass('public.teacher_sessions') as teacher_sessions, to_regclass('public.teacher_reviews') as reviews, to_regclass('public.effective_answers') as effective_answers, to_regprocedure('has_student_response(jsonb,jsonb)') as response_presence");
  if (!rows[0]?.students || !rows[0]?.attempts || !rows[0]?.protections || !rows[0]?.teacher_sessions || !rows[0]?.reviews || !rows[0]?.effective_answers || !rows[0]?.response_presence) {
    console.error('Connected to PostgreSQL. Run pnpm db:migrate to initialize the schema.');
    process.exitCode = 1;
  } else {
    console.log('Database connected; student and Box 6 teacher schemas are ready.');
  }
} catch {
  // Driver errors can contain connection details; never print them.
  console.error('Database check failed. Check connection settings and Neon availability.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
