import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  DATABASE_URL: { schema: (value: string | undefined) => value, static: false, public: false },
  TEACHER_ENTRY_NAME: { schema: (value: string | undefined) => value, static: false, public: false }
});
