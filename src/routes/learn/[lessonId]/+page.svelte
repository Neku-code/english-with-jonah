<script lang="ts">
 import {onMount,tick,untrack} from 'svelte';
 import {goto,invalidateAll,replaceState} from '$app/navigation';
 import {page} from '$app/state';
 import LessonIllustration from '#lib/components/LessonIllustration.svelte';
 import LessonTask from '#lib/components/LessonTask.svelte';
 import LessonAudio from '#lib/components/LessonAudio.svelte';
 import VocabularyPrep from '#lib/components/VocabularyPrep.svelte';
 import {tasksOf,type Task} from '#lib/learning/types.ts';
 import {unpack} from '#lib/learning/response.ts';
 import {request} from '#lib/learning/client.ts';
 import {LatestWriteQueue} from '#lib/learning/latest-write.ts';
 import '../../../lesson.css';

 let {data}=$props();
 type Attempt=NonNullable<typeof data.attempt>;
 type Check={id?:string;questionId:string;response:string;answerRevision:number;earnedPoints:number|null;reviewStatus:string;feedback?:string;notes?:string};
 type CheckResult=Check&{attempt:Pick<Attempt,'id'|'status'|'earnedPoints'|'maxPoints'|'pendingReview'>;coinsAwarded:number};
 let attempt=$state<Attempt|null>(untrack(()=>data.attempt));
 let windowIndex=$state(0),drafts=$state<Record<string,string>>({}),revisions=$state<Record<string,number>>({}),checks=$state<Check[]>([]),panels=$state<Record<string,string>>({});
 let dirty=$state<string[]>([]),saving=$state(false),checking=$state(''),busy=$state(false),message=$state(''),review=$state(false);
 let ready=$state(untrack(()=>!data.lesson.needsVocabulary)),vocabMastered=$state(untrack(()=>data.lesson.vocabularyMastered));
 let prep=$state(untrack(()=>!data.attempt||page.url.searchParams.has('vocab'))),coinDelta=$state(0);
 let audioPlays=$state(0),audioStatus=$state('idle'),hydrated=false;
 let navigationDialog:HTMLDialogElement,vocabDialog:HTMLDialogElement;
 let heading=$state<HTMLHeadingElement>();
 let illustration=$state<{open:()=>Promise<void>}>();
 let saveTimer:ReturnType<typeof setTimeout>,savePromise:Promise<boolean>|null=null;
 let positionQueue:LatestWriteQueue<{sectionId:string;panels:Record<string,string>}>|null=null;
 let pendingCheck:{taskId:string;response:string;revision:number;requestId:string}|null=null;
 let loadedKey='';
 const content=$derived(data.content),tasks=$derived(tasksOf(content)),exam=$derived(content.kind==='exam'),submitted=$derived(attempt?.status==='submitted');
 const window=$derived(content.sections[Math.min(windowIndex,content.sections.length-1)]);
 const currentTask=$derived(window.items.find((item):item is Task=>item.kind==='task'));
 const image=$derived(content.images.find(i=>i.id===(window.imageId??currentTask?.imageId)));
 const storageKey=$derived(`jonah:${data.student.id}:${attempt?.id}:${content.version}`);
 const questionFor=(task:Task)=>attempt?.questions.find(q=>q.content.task?.id===task.id);
 const filled=(task:Task)=>{const values=unpack(drafts[task.id]);return task.parts.every(p=>typeof values[p.id]==='string'?(values[p.id] as string).trim():Array.isArray(values[p.id])&&(values[p.id] as string[]).length);};
 function feedback(task:Task){
  const q=questionFor(task);if(!q)return null;
  const checked=checks.findLast(c=>c.questionId===q.id&&c.response===drafts[task.id]&&c.answerRevision===revisions[q.id]);
  if(checked)return checked;
  const answer=submitted?attempt?.answers.find(a=>a.questionId===q.id):null;
  return answer?{reviewStatus:answer.reviewStatus,earnedPoints:answer.earnedPoints,feedback:q.feedback??answer.feedback??undefined}:null;
 }
 const lessonJustFinished=$derived(!exam&&submitted&&!data.lesson.completed);
 const correctCount=$derived(tasks.filter(t=>feedback(t)?.earnedPoints===t.maxPoints).length);
 const canAdvance=$derived(exam||!currentTask||submitted||feedback(currentTask)?.earnedPoints===currentTask.maxPoints);
 const unanswered=$derived(tasks.filter(t=>!filled(t)));

 function cache(){
  if(!hydrated||!attempt||submitted)return;
  try{localStorage.setItem(storageKey,JSON.stringify({drafts,revisions,dirty,windowIndex,panels,pendingCheck}));}
  catch{message='Qurilmada saqlash ishlamadi. Serverga saqlanishini kuting.';}
 }
 function initialize(){
  positionQueue?.stop();
  windowIndex=Math.max(0,content.sections.findIndex(s=>s.id===attempt?.workspace?.sectionId));panels={...attempt?.workspace?.panels};
  drafts={};revisions={};dirty=[];checks=(attempt?.checks??[]) as Check[];pendingCheck=null;review=false;message='';
  for(const q of attempt?.questions??[]){if(!q.content.task)continue;const answer=attempt?.answers.find(a=>a.questionId===q.id);drafts[q.content.task.id]=answer?.response??'{}';revisions[q.id]=answer?.revision??0;}
  audioPlays=attempt?.workspace?.audioPlays??0;audioStatus=attempt?.workspace?.audioStatus??'idle';
  const attemptId=attempt?.id;let checkpointRevision=attempt?.workspace?.revision??0;
  positionQueue=attemptId?new LatestWriteQueue(async snapshot=>{
   const result=await request<{revision:number}>(`/api/attempts/${attemptId}/study`,{action:'navigate',...snapshot,revision:checkpointRevision});checkpointRevision=result.revision;
  },e=>{if(attempt?.id===attemptId)message=(e as Error).message;}):null;
  if(attempt&&!submitted)try{
   const local=JSON.parse(localStorage.getItem(storageKey)??'null');
   if(local){
    for(const taskId of local.dirty??[]){const task=tasks.find(t=>t.id===taskId),q=task&&questionFor(task);if(q&&local.revisions[q.id]===(revisions[q.id]??0)){drafts[taskId]=local.drafts[taskId];dirty=[...dirty,taskId];}else message='Boshqa oynada yangilangan javob bor. Serverdagi nusxa saqlandi.';}
    windowIndex=Math.max(0,Math.min(local.windowIndex??local.sectionIndex??windowIndex,content.sections.length-1));
    panels=local.panels??panels;pendingCheck=local.pendingCheck??null;
   }
  }catch{ /* Invalid local cache never replaces server data. */ }
  hydrated=true;
  if(dirty.length)saveTimer=setTimeout(()=>void flush(),650);
 }
 onMount(()=>{
  loadedKey=data.lesson.id+':'+data.attempt?.id;initialize();
  const online=()=>{void flush();void positionQueue?.flush().catch(e=>message=(e as Error).message);};
  addEventListener('online',online);
  return()=>{cache();clearTimeout(saveTimer);positionQueue?.stop();removeEventListener('online',online);};
 });
 $effect(()=>{
  const nextKey=data.lesson.id+':'+data.attempt?.id;
  if(hydrated&&loadedKey!==nextKey){loadedKey=nextKey;attempt=data.attempt;prep=!data.attempt||page.url.searchParams.has('vocab');ready=!data.lesson.needsVocabulary;vocabMastered=data.lesson.vocabularyMastered;coinDelta=0;initialize();}
 });
 function change(task:Task,value:string){drafts={...drafts,[task.id]:value};if(!dirty.includes(task.id))dirty=[...dirty,task.id];cache();clearTimeout(saveTimer);saveTimer=setTimeout(()=>void flush(),650);}
 async function flush():Promise<boolean>{
  if(savePromise)return savePromise;
  if(!attempt||submitted||!dirty.length)return true;
  clearTimeout(saveTimer);const attemptId=attempt.id;
  savePromise=(async()=>{
   saving=true;
   try{
    while(dirty.length&&attempt?.id===attemptId){
     const batch:{taskId:string;questionId:string;response:string;expectedRevision:number}[]=[];let bytes=0;
     for(const taskId of dirty){
      const task=tasks.find(t=>t.id===taskId),q=task&&questionFor(task);if(!q)continue;
      const item={taskId,questionId:q.id,response:drafts[taskId]??'{}',expectedRevision:revisions[q.id]??0};
      const size=new TextEncoder().encode(JSON.stringify(item)).length;if(batch.length&&bytes+size>20000)break;
      bytes+=size;batch.push(item);
     }
     if(!batch.length){dirty=[];break;}
     const result=await request<{saved:{questionId:string;revision:number}[]}>(`/api/attempts/${attemptId}/answers`,{answers:batch.map(({taskId,...item})=>item)},'PUT');
     if(attempt?.id!==attemptId)return true;
     for(const saved of result.saved){const item=batch.find(item=>item.questionId===saved.questionId)!;revisions={...revisions,[saved.questionId]:saved.revision};if(drafts[item.taskId]===item.response)dirty=dirty.filter(id=>id!==item.taskId);}
     cache();
    }
    return true;
   }catch(e){message=(e as Error).message+' Javob qurilmada saqlangan.';return false;}
   finally{saving=false;savePromise=null;}
  })();
  return savePromise;
 }
 function checkpoint(){cache();if(!submitted)positionQueue?.enqueue({sectionId:window.id,panels:{...panels}});}
 async function move(index:number){
  if(index<0||index>=content.sections.length||(index>windowIndex&&!canAdvance))return;
  // The next window is local state. Persistence never delays the transition.
  windowIndex=index;checkpoint();await tick();heading?.focus();heading?.scrollIntoView({block:'start',behavior:'instant'});
 }
 function selectPanel(id:string){if(image){panels={...panels,[image.id]:id};checkpoint();}}
 function focusTask(task:Task){if(task.imageId&&task.panelId&&panels[task.imageId]!==task.panelId){panels={...panels,[task.imageId]:task.panelId};checkpoint();}}
 async function check(task:Task){
  if(checking||!attempt||submitted)return;checking=task.id;message='';clearTimeout(saveTimer);
  try{
   if(savePromise&&!await savePromise)return;
   const q=questionFor(task)!,response=drafts[task.id]??'{}',revision=revisions[q.id]??0,attemptId=attempt.id;
   if(!pendingCheck||pendingCheck.taskId!==task.id||pendingCheck.response!==response||pendingCheck.revision!==revision)pendingCheck={taskId:task.id,response,revision,requestId:crypto.randomUUID()};
   cache();
   const result=await request<CheckResult>(`/api/attempts/${attemptId}/check`,{questionId:q.id,response,expectedRevision:revision,requestId:pendingCheck.requestId});
   if(attempt?.id!==attemptId)return;
   revisions={...revisions,[q.id]:result.answerRevision};if(drafts[task.id]===response)dirty=dirty.filter(id=>id!==task.id);
   if(!checks.some(c=>c.id===result.id))checks=[...checks,result];
   coinDelta+=result.coinsAwarded;attempt={...attempt,...result.attempt};pendingCheck=null;cache();
   if(result.attempt.status==='submitted')try{localStorage.removeItem(storageKey);}catch{}
  }catch(e){message=(e as Error).message;}
  finally{checking='';}
 }
 async function start(reviewVocabulary=false){
  if(busy||checking)return;busy=true;message='';
  try{
   if(attempt&&!submitted&&!await flush())return;
   const result=await request<{attempt:Attempt}>(`/api/lessons/${data.lesson.id}/attempts`,{reviewVocabulary,bootstrap:true});
   attempt=result.attempt;ready=true;prep=false;initialize();replaceState(`/learn/${data.lesson.id}?attempt=${attempt.id}`,page.state);
  }catch(e){message=(e as Error).message;}
  finally{busy=false;}
 }
 async function submitExam(){
  if(!exam||!attempt||busy)return;busy=true;message='';
  try{
   if(!await flush())return;
   await request(`/api/attempts/${attempt.id}/submit`,{});try{localStorage.removeItem(storageKey);}catch{}
   await invalidateAll();attempt=data.attempt;review=false;
  }catch(e){message=(e as Error).message;}finally{busy=false;}
 }
 async function switchLesson(event:MouseEvent,href:string){
  event.preventDefault();if(busy)return;busy=true;
  try{
   const [saved]=await Promise.all([flush(),positionQueue?.flush()]);if(!saved)return;
   navigationDialog?.close();await goto(href);
  }catch(e){message=(e as Error).message;}finally{busy=false;}
 }
 async function reviewTask(task:Task){review=false;windowIndex=content.sections.findIndex(s=>s.items.some(i=>i.id===task.id));checkpoint();await tick();heading?.focus();}
</script>

<svelte:head><title>{content.number} · {content.title} · English with Jonah</title></svelte:head>
<div class="learning-page compact-learning">
 <div class="learning-top"><a href="/home" onclick={e=>switchLesson(e,'/home')}>← Darslar</a><span>UNIT 1 · TO BE</span><a href="/ranking" onclick={e=>switchLesson(e,'/ranking')}>Ranking</a><button class="mobile-lessons" onclick={()=>navigationDialog.showModal()}>Darslar ☰</button></div>
 <div class="learning-workspace">
  <aside class="lesson-sidebar"><p class="eyebrow">UNIT 1</p><h2>To Be</h2><p class="sidebar-progress">{data.unit.finished+(lessonJustFinished?1:0)} / {data.unit.total} dars tugallangan<br />{data.unit.points+coinDelta} / {data.unit.maximumPoints} coin</p><nav aria-label="Unit 1 darslari">{#each data.unit.lessons as l}<a href={l.href} data-sveltekit-preload-data="hover" aria-current={l.id===data.lesson.id?'page':undefined} onclick={e=>switchLesson(e,l.href)}><span class="sidebar-number">1.{l.position}</span><span>{l.title.split(' · ').at(-1)}<small>{l.mastered?'★ O‘zlashtirilgan':l.completed||l.id===data.lesson.id&&submitted&&!exam?'✓ Tugallangan':l.kind==='final_exam'?'Yakuniy imtihon':`${l.taskCount} ta mashq`}</small></span></a>{/each}</nav></aside>
  <div class="lesson-main">
   <header class="lesson-title"><div><p class="eyebrow">{exam?'YAKUNIY IMTIHON':'DARS'} {content.number}</p><h1>{content.title}</h1></div>{#if !exam||submitted}<button class="button button--secondary" disabled={busy||!!checking} onclick={()=>vocabDialog.showModal()}>Lug‘at ↗</button>{/if}</header>
   {#if message}<div class="feedback feedback--error save-error" role="alert"><p>{message}</p><button class="button button--secondary" onclick={()=>{void flush();void positionQueue?.flush().catch(e=>message=(e as Error).message);}}>Qayta saqlash</button><a href={page.url.pathname+page.url.search}>Qayta yuklash</a></div>{/if}
   {#if prep}<VocabularyPrep lesson={content} lessonId={data.lesson.id} {ready} hasSession={!!data.vocabularySession} mastered={vocabMastered} onready={coins=>{ready=true;vocabMastered=true;coinDelta+=coins;}} onstart={start} {busy} needsLessons={data.lesson.needsLessons} />
   {:else if attempt}
    <div class="lesson-status"><span role="status">{saving?'Saqlanmoqda…':dirty.length?'Qurilmada saqlangan':'✓ Saqlangan'}</span><span>{exam?`${tasks.length-unanswered.length} / ${tasks.length} javob`:`${correctCount} / ${tasks.length} to‘g‘ri`}</span></div>
    {#if submitted&&!exam}<section class="lesson-result" role="status"><h2>✓ Dars tugallangan</h2><p>Barcha mashqlar to‘g‘ri bajarilgan. Bu dars uchun 50 coin bir marta beriladi.</p><button class="button button--secondary" disabled={busy} onclick={()=>start()}>Yana mashq qilish</button><a class="button button--primary" href="/home">Darslarga qaytish →</a></section>
    {:else if submitted}<section class="lesson-result"><h2>{attempt.earnedPoints} / {attempt.maxPoints} ball</h2><p>{(attempt.earnedPoints??0)*100>=90*(attempt.maxPoints??1)?'★ Yakuniy imtihondan o‘tdingiz. Darslar o‘zlashtirildi.':'Xatolarni ko‘rib chiqing va yana urinib ko‘ring.'}</p><button class="button button--secondary" disabled={busy} onclick={()=>start()}>Qayta topshirish</button></section>{/if}
    <div class="window-progress"><progress max={content.sections.length} value={windowIndex+1} aria-label="Darsdagi oyna"></progress><span>{windowIndex+1} / {content.sections.length}</span></div>
    <div class="section-heading-row"><h2 bind:this={heading} tabindex="-1">{window.title}</h2></div>
    {#key window.id}<section class:has-illustration={!!image} class="authored-section lesson-window" aria-label={window.title}>
     {#if image}<div class="section-picture"><LessonIllustration bind:this={illustration} {image} selected={panels[image.id]??currentTask?.panelId??image.panels[0]?.id} onselect={selectPanel} /></div>{/if}
     <div class="section-material">{#each window.items as item}
      {#if item.kind==='text'}<div class="lesson-text" id={item.id}>{#each item.text.split('\n') as line}<p>{line}</p>{/each}</div>
      {:else if item.kind==='audio'}<LessonAudio attemptId={attempt.id} {exam} {submitted} initialPlays={audioPlays} initialStatus={audioStatus} onstate={(plays,status)=>{audioPlays=plays;audioStatus=status;}} />
      {:else}<LessonTask task={item} value={drafts[item.id]??'{}'} onchange={value=>change(item,value)} oncheck={()=>check(item)} onfocus={()=>focusTask(item)} onimage={async()=>{focusTask(item);await tick();await illustration?.open();}} feedback={feedback(item)} disabled={submitted} busy={checking===item.id} {exam} />{/if}
     {/each}</div>
    </section>{/key}
    <div class="lesson-bottom"><button class="button button--secondary" disabled={windowIndex===0} onclick={()=>move(windowIndex-1)}>← Oldingi</button><span>{windowIndex+1} / {content.sections.length}</span>{#if windowIndex<content.sections.length-1}<button class="button button--primary" disabled={!canAdvance} onclick={()=>move(windowIndex+1)}>Keyingi →</button>{:else if exam&&!submitted}<button class="button button--primary" onclick={()=>review=true}>Imtihonni yakunlash</button>{:else if submitted}<a class="button button--primary" href="/home" onclick={e=>switchLesson(e,'/home')}>Darslar →</a>{:else}<span role="status">Mashqni to‘g‘ri bajaring.</span>{/if}</div>
    {#if review&&exam}<section class="submission-review"><h2>Imtihonni topshirish</h2><p>{unanswered.length?`${unanswered.length} ta savol javobsiz.`:'Barcha savollarga javob berilgan.'}</p><div class="review-grid">{#each tasks as task}<button class:unanswered={!filled(task)} onclick={()=>reviewTask(task)}>{task.number}</button>{/each}</div><div class="prep-actions"><button class="button button--secondary" onclick={()=>review=false}>Davom ettirish</button><button class="button button--primary" disabled={busy||saving} onclick={submitExam}>{busy?'Topshirilmoqda…':'Imtihonni topshirish'}</button></div></section>{/if}
   {/if}
  </div>
 </div>
</div>
<dialog class="lesson-drawer" bind:this={navigationDialog} aria-label="Dars tanlash"><div class="drawer-heading"><h2>Unit 1 · To Be</h2><button class="button button--secondary" onclick={()=>navigationDialog.close()}>Yopish ×</button></div><nav>{#each data.unit.lessons as l}<a href={l.href} onclick={e=>switchLesson(e,l.href)} aria-current={l.id===data.lesson.id?'page':undefined}>{l.title}<small>{l.completed?'✓ Tugallangan':l.kind==='lesson'?`${l.taskCount} ta mashq`:'Yakuniy imtihon'}</small></a>{/each}</nav></dialog>
<dialog class="vocab-dialog" bind:this={vocabDialog} aria-label="Lug‘at"><div class="drawer-heading"><h2>Vocab {content.number}</h2><button class="button button--primary" onclick={()=>vocabDialog.close()}>Yopish ×</button></div>{#if !exam}<button class="button button--secondary" onclick={()=>{vocabDialog.close();prep=true;}}>Lug‘at testi · {vocabMastered?'O‘zlashtirilgan':'+30 coin'} →</button>{/if}<dl class="vocabulary-list">{#each content.vocabulary as word}<div><dt lang="en">{word.english}</dt><dd>{word.uzbek}</dd></div>{/each}</dl></dialog>
