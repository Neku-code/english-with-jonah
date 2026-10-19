import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { adminAction, adminRead } from '#lib/server/admin/http';
import { addManagedStudent, listStudents } from '#lib/server/admin/data';
export const load: PageServerLoad = event => adminRead(event, () => listStudents(getDb(), event.url));
export const actions: Actions = {
  add: event => adminAction(event, async (form, teacherId) => {
    await addManagedStudent(getDb(), teacherId, form);
    return { message: 'O‘quvchi qo‘shildi. Endi ro‘yxatdagi ismi bilan kirishi mumkin.' };
  })
};
