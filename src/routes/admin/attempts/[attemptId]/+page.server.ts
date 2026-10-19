import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { adminAction, adminRead } from '#lib/server/admin/http';
import { attemptDetail } from '#lib/server/admin/data';
import { saveReview } from '#lib/server/admin/reviews';
import { uuid } from '#lib/server/validation';
export const load: PageServerLoad = event => adminRead(event, () => attemptDetail(getDb(), event.params.attemptId));
export const actions: Actions = {
  review: event => adminAction(event, async (form, teacherId) => {
    await saveReview(getDb(), teacherId, event.params.attemptId, uuid(form.get('questionId')), {
      requestId: form.get('requestId'), expectedRevision: form.get('expectedRevision'), feedback: form.get('feedback'), points: form.get('points')
    });
    return { message: 'Baholash saqlandi. Natija va dars holati yangilandi.' };
  })
};
