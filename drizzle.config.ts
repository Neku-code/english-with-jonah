import './scripts/env.mjs';
import { defineConfig } from 'drizzle-kit';
import { postgresUrl } from './src/lib/server/db/url.js';

const migrationUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: migrationUrl ? postgresUrl(migrationUrl) : ''
  },
  strict: true
});
