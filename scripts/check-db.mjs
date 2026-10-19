import { databaseClient, databaseUrl } from './database.mjs';

try {
  databaseUrl();
} catch {
  console.error('Database is not configured. Add the Neon connection string to .env as DATABASE_URL.');
  process.exit(1);
}

try {
  const sql = databaseClient();
  await sql`select 1`;
  const rows = await sql`select to_regclass('public.app_metadata') as table_name`;
  if (!rows[0]?.table_name) {
    console.error('Connected to PostgreSQL. Run pnpm db:migrate to initialize the schema.');
    process.exitCode = 1;
  } else {
    console.log('Database connected; Box 1 schema is ready.');
  }
} catch {
  // Driver errors can contain connection details; never print them.
  console.error('Database check failed. Check connection settings and Neon availability.');
  process.exitCode = 1;
}
