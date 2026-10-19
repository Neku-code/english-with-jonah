import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { requireStudent } from '#lib/server/http';
import { homeData } from '#lib/server/learning/catalog';
import { rankings } from '#lib/server/learning/rewards';

export const load: PageServerLoad = async event => {
  const student = requireStudent(event);
  const [home, ranking] = await Promise.allSettled([
    homeData(getDb(), student.id), rankings(getDb(), student.id)
  ]);
  return {
    student,
    home: home.status === 'fulfilled' ? home.value : null,
    standing: ranking.status === 'fulfilled' ? ranking.value.find(row => row.isCurrent) ?? null : null
  };
};
