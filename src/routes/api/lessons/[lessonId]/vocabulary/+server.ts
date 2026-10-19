import {api} from '#lib/server/http';
import {getDb} from '#lib/server/db';
import {vocabularyAction} from '#lib/server/learning/study';
export const POST = (event:import('@sveltejs/kit').RequestEvent) => api(event,(id,body)=>vocabularyAction(getDb(),id,event.params.lessonId!,body));
