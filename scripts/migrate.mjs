import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { databaseUrl } from './database.mjs';

try {
  const db = drizzle(databaseUrl(true));
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Database migrations applied.');
} catch {
  console.error('Migration failed. Check the server-only database settings and migration history.');
  process.exitCode = 1;
}
