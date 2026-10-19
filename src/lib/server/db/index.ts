import { DATABASE_URL } from '$app/env/private';
import { attachDatabasePool } from '@vercel/functions';
import { connectDatabase } from './connect';

let connection: ReturnType<typeof connectDatabase> | undefined;

// Lazy initialization: the app and build work before a database is provisioned.
export function getDb() {
  if (!DATABASE_URL) throw new Error('Database is not configured.');
  if (!connection) {
    connection = connectDatabase(DATABASE_URL);
    attachDatabasePool(connection.pool);
  }
  return connection.db;
}
