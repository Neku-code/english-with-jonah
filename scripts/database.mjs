import './env.mjs';
import { Pool } from 'pg';
import { postgresUrl } from '../src/lib/server/db/url.js';

export function databaseUrl(migration = false) {
  const value = (migration && process.env.DATABASE_URL_UNPOOLED) || process.env.DATABASE_URL;
  if (!value) throw new Error('Set DATABASE_URL in .env.local, .env or the server environment.');
  return postgresUrl(value);
}

export function databaseClient(migration = false) {
  return new Pool({ connectionString: databaseUrl(migration), max: 1, connectionTimeoutMillis: 10_000 });
}
