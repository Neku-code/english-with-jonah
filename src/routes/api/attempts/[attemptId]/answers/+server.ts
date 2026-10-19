import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db';
import { api } from '#lib/server/http';
import { saveAnswer, saveAnswers } from '#lib/server/learning/attempts';
export const PUT: RequestHandler = event => api(event, (student, body) => Array.isArray(body.answers) ? saveAnswers(getDb(), student, event.params.attemptId, body.answers) : saveAnswer(getDb(), student, event.params.attemptId, { questionId: body.questionId, response: body.response, expectedRevision: body.expectedRevision }));
