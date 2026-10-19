import {api} from '#lib/server/http';
import {getDb} from '#lib/server/db';
import {studyAction} from '#lib/server/learning/study';
export const POST = (event:import('@sveltejs/kit').RequestEvent) => api(event,(id,body)=>studyAction(getDb(),id,event.params.attemptId!,body));
