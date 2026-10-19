import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { requireStudent } from '#lib/server/http';
import { homeData } from '#lib/server/learning/catalog';

export const load: PageServerLoad = async event => {
  const student = requireStudent(event);
  try { return { student, home: await homeData(getDb(), student.id), unavailable: false }; }
  catch { return { student, home: null, unavailable: true }; }
};
