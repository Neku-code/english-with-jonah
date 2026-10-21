import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { requireStudent } from '#lib/server/http';
import { homeData } from '#lib/server/learning/catalog';
import { unit1, stableUuid } from '#lib/server/learning/unit1';
import { unit2 } from '#lib/server/learning/unit2';

export const load: PageServerLoad = async event => {
  const student = requireStudent(event);
  try {
    const home=await homeData(getDb(),student.id);
    const published=new Set(home.units.flatMap(u=>u.lessons.map(l=>l.versionId)));
    const words=[...unit1,...unit2].filter(l=>l.kind!=='exam'&&published.has(stableUuid(l.id+'@'+l.version)))
      .flatMap(l=>l.vocabulary.map(word=>({...word,lesson:l.number,href:`/learn/${stableUuid(l.id)}?vocab`})));
    return {student,home,words,unavailable:false};
  }
  catch { return { student, home: null, words: [], unavailable: true }; }
};
