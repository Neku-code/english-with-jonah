import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Box 1 stores application metadata only. Student tables follow the identity decision.
export const appMetadata = pgTable('app_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
