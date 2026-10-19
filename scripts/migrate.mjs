import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { databaseClient } from './database.mjs';

let pool;
try {
  pool = databaseClient(true);
  const db = drizzle(pool);
  // Serialize migrations from concurrent operator/deploy jobs.
  await pool.query('select pg_advisory_lock(182759321)');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Database migrations applied.');
} catch {
  console.error('Migration failed. Check the server-only database settings and migration history.');
  process.exitCode = 1;
} finally {
  if (pool) { await pool.query('select pg_advisory_unlock(182759321)').catch(() => {}); await pool.end(); }
}
