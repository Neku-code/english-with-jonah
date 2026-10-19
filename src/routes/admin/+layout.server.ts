import type { LayoutServerLoad } from './$types';
import { requireTeacher } from '#lib/server/admin/http';
export const load: LayoutServerLoad = event => { requireTeacher(event); return {}; };
