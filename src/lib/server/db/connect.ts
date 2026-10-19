import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { postgresUrl } from './url.js';

export type Database = NodePgDatabase<typeof schema>;
export type Connection = Pick<Database, 'select' | 'insert' | 'update' | 'delete' | 'execute'>;
export function connectDatabase(url: string) {
  // Neon pooled URLs use the native PostgreSQL protocol. TLS follows sslmode in
  // the private URL; do not disable certificate validation in application code.
  const pool = new Pool({ connectionString: postgresUrl(url), max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  pool.on('error', () => console.error('An idle database connection failed.'));
  return { db: drizzle(pool, { schema }), pool };
}
