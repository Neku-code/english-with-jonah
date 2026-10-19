import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ quiet: true });

export function databaseUrl(migration = false) {
  const value = (migration && process.env.DATABASE_URL_UNPOOLED) || process.env.DATABASE_URL;
  if (!value) throw new Error('Set DATABASE_URL in your local .env or server environment.');
  const parsed = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  }
  return value;
}

export function databaseClient() {
  return neon(databaseUrl());
}
