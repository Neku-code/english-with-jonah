import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { adminAction, adminRead } from '#lib/server/admin/http';
import { manageStudent, studentDetail } from '#lib/server/admin/data';
export const load: PageServerLoad = event => adminRead(event, () => studentDetail(getDb(), event.params.studentId, event.url));
export const actions: Actions = Object.fromEntries(['rename', 'archive', 'reactivate'].map(operation => [operation,
  (event: Parameters<NonNullable<Actions[string]>>[0]) => adminAction(event, async (form, teacherId) => {
    await manageStudent(getDb(), teacherId, event.params.studentId, operation, form);
    return { message: operation === 'rename' ? 'Profil ma’lumotlari yangilandi.' : operation === 'archive' ? 'Profil nofaol qilindi. Kirish yopildi, o‘qish tarixi saqlandi.' : 'Profil faollashtirildi. O‘quvchi yana ismi bilan kirishi mumkin.' };
  })]));
