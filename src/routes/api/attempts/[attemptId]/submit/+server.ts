import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db';
import { api } from '#lib/server/http';
import { submitAttempt } from '#lib/server/learning/attempts';
export const POST: RequestHandler = event => api(event, student => submitAttempt(getDb(), student, event.params.attemptId));
