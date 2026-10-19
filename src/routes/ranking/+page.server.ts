import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { requireStudent } from '#lib/server/http';
import { rankings } from '#lib/server/learning/rewards';

export const load: PageServerLoad = async event => {
  const student = requireStudent(event);
  try { return { rows: await rankings(getDb(), student.id), unavailable: false }; }
  catch { return { rows: [], unavailable: true }; }
};
