import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db';
import { api } from '#lib/server/http';
import { startAttempt } from '#lib/server/learning/attempts';
export const POST: RequestHandler = event => api(event, student => startAttempt(getDb(), student, event.params.lessonId));
