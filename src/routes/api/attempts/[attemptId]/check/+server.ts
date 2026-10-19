import {api} from '#lib/server/http';
import {getDb} from '#lib/server/db';
import {checkPractice} from '#lib/server/learning/study';
export const POST = (event:import('@sveltejs/kit').RequestEvent) => api(event,(id,body)=>checkPractice(getDb(),id,event.params.attemptId!,body));
