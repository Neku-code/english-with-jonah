import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db';
import { api } from '#lib/server/http';
import { loadAttempt } from '#lib/server/learning/attempts';
export const GET: RequestHandler = event => api(event, student => loadAttempt(getDb(), student, event.params.attemptId));
