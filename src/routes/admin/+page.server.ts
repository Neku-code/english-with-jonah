import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { adminRead } from '#lib/server/admin/http';
import { overview } from '#lib/server/admin/data';
export const load: PageServerLoad = event => adminRead(event, async () => ({ counts: await overview(getDb()) }));
