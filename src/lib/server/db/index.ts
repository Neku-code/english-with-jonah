import { DATABASE_URL } from '$app/env/private';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy initialization: the app and build work before a database is provisioned.
export function getDb() {
  if (!DATABASE_URL) throw new Error('Database is not configured.');
  return drizzle(neon(DATABASE_URL), { schema });
}
