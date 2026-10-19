<script lang="ts">
 import {onMount,tick,untrack} from 'svelte';
 import {goto,invalidateAll} from '$app/navigation';
 import {page} from '$app/state';
 import LessonIllustration from '#lib/components/LessonIllustration.svelte';
 import LessonTask from '#lib/components/LessonTask.svelte';
 import LessonAudio from '#lib/components/LessonAudio.svelte';
 import VocabularyPrep from '#lib/components/VocabularyPrep.svelte';
 import {tasksOf,type Task} from '#lib/learning/types.ts';
 import {unpack} from '#lib/learning/response.ts';
 import {request} from '#lib/learning/client.ts';
 import '../../../lesson.css';
 let {data}=$props();
 type Check={questionId:string;response:string;answerRevision:number;earnedPoints:number|null;reviewStatus:string;feedback?:string;notes?:string};
 const initialDrafts=()=>Object.fromEntries((data.attempt?.questions??[]).filter(q=>q.content.task).map(q=>[q.content.task!.id,data.attempt?.answers.find(a=>a.questionId===q.id)?.response??'{}']));
 let sectionIndex=$state(untrack(()=>Math.max(0,data.content.sections.findIndex(s=>s.id===data.attempt?.workspace?.sectionId)))),drafts=$state<Record<string,string>>(untrack(initialDrafts)),revisions=$state<Record<string,number>>({}),checks=$state<Check[]>(untrack(()=>(data.attempt?.checks??[])as Check[])),panels=$state<Record<string,string>>(untrack(()=>({...data.attempt?.workspace?.panels}))),workspaceRevision=0;
 let dirty=$state<string[]>([]),saving=$state(false),positionSaving=$state(0),positionDirty=false,message=$state(''),busy=$state(false),checking=$state(''),ready=$state(false),review=$state(false),hydrated=false;
 let navigationDialog:HTMLDialogElement,vocabDialog:HTMLDialogElement,sectionHeading=$state<HTMLHeadingElement>();
 let audioPlays=$state(0),audioStatus=$state('idle');
 let illustration=$state<{open:()=>Promise<void>}>();
 let saveTimer:ReturnType<typeof setTimeout>,positionTimer:ReturnType<typeof setTimeout>,savePromise:Promise<boolean>|null=null,positionPromise:Promise<void>=Promise.resolve();
 const content=$derived(data.content),tasks=$derived(tasksOf(content)),attempt=$derived(data.attempt),exam=$derived(content.kind==='exam'),submitted=$derived(attempt?.status==='submitted');
 const section=$derived(content.sections[Math.min(sectionIndex,content.sections.length-1)]);
 const firstTask=$derived(section.items.find((i):i is Task=>i.kind==='task'));
 const image=$derived(content.images.find(i=>i.id===(section.imageId??firstTask?.imageId)));
 const prep=$derived(!attempt||page.url.searchParams.has('vocab')||data.lesson.needsVocabulary);
 const key=$derived(`jonah:${data.student.id}:${attempt?.id}:${content.version}`);
 const questionFor=(task:Task)=>attempt?.questions.find(q=>q.content.task?.id===task.id);
 const completed=$derived(new Set(checks.map(c=>c.questionId)).size);
 const filled=(task:Task)=>{const p=unpack(drafts[task.id]);return task.parts.every(x=>typeof p[x.id]==='string'?(p[x.id] as string).trim():Array.isArray(p[x.id])&&(p[x.id] as string[]).length);};
 const unanswered=$derived(tasks.filter(t=>!filled(t)));
 function cache(){if(!hydrated||!attempt||submitted)return;try{localStorage.setItem(key,JSON.stringify({drafts,revisions,dirty,sectionIndex,panels,positionDirty}));}catch{message='Qurilmada vaqtincha saqlash ishlamadi. Internet orqali saqlanishini kuting.';}}
 function initialize(){
  sectionIndex=Math.max(0,content.sections.findIndex(s=>s.id===attempt?.workspace?.sectionId));panels={...attempt?.workspace?.panels};workspaceRevision=attempt?.workspace?.revision??0;
  drafts={};revisions={};for(const q of attempt?.questions??[]){if(!q.content.task)continue;const a=attempt?.answers.find(a=>a.questionId===q.id);drafts[q.content.task.id]=a?.response??'{}';revisions[q.id]=a?.revision??0;}
  checks=(attempt?.checks??[]) as Check[];dirty=[];ready=!data.lesson.needsVocabulary;review=false;message='';audioPlays=attempt?.workspace?.audioPlays??0;audioStatus=attempt?.workspace?.audioStatus??'idle';
  if(attempt&&!submitted)try{const local=JSON.parse(localStorage.getItem(key)??'null');if(local){for(const taskId of local.dirty??[]){const q=attempt.questions.find(q=>q.content.task?.id===taskId);if(q&&local.revisions[q.id]===(revisions[q.id]??0)){drafts[taskId]=local.drafts[taskId];dirty=[...dirty,taskId];}else message='Boshqa oynada yangilangan javob bor. Serverdagi javob saqlandi; ushbu qurilmadagi nusxa vaqtincha xotirada.';}if(local.dirty?.length||local.positionDirty){sectionIndex=Math.min(local.sectionIndex??0,content.sections.length-1);panels=local.panels??panels;positionDirty=!!local.positionDirty;}}}catch{}
  hydrated=true;if(dirty.length)void flush();
 }
 onMount(()=>{initialize();const online=()=>{void flush();void savePosition();};window.addEventListener('online',online);return()=>{cache();clearTimeout(saveTimer);clearTimeout(positionTimer);window.removeEventListener('online',online);};});
 let lastContent='';$effect(()=>{const id=data.attempt?.id??data.lesson.id;if(hydrated&&lastContent!==id){lastContent=id;initialize();}});
 function change(task:Task,value:string){drafts={...drafts,[task.id]:value};if(!dirty.includes(task.id))dirty=[...dirty,task.id];cache();clearTimeout(saveTimer);saveTimer=setTimeout(()=>void flush(),650);}
 async function flush():Promise<boolean>{
  if(savePromise)return savePromise;if(!attempt||submitted||!dirty.length)return true;clearTimeout(saveTimer);const aid=attempt.id;
  savePromise=(async()=>{saving=true;try{while(dirty.length){const taskId=dirty[0],task=tasks.find(t=>t.id===taskId)!,q=questionFor(task)!;const response=drafts[taskId]??'{}';const r=await request<{revision:number}>(`/api/attempts/${aid}/answers`,{questionId:q.id,response,expectedRevision:revisions[q.id]??0},'PUT');revisions={...revisions,[q.id]:r.revision};if(drafts[taskId]===response)dirty=dirty.filter(x=>x!==taskId);cache();}message='';return true;}catch(e){message=(e as Error).message+' Javob shu qurilmada saqlandi. Qayta saqlashni bosing.';return false;}finally{saving=false;savePromise=null;}})();return savePromise;
 }
 function savePosition(){
  if(!attempt||submitted)return Promise.resolve();clearTimeout(positionTimer);const aid=attempt.id,sectionId=section.id,selection={...panels};positionSaving++;
  positionPromise=positionPromise.catch(()=>{}).then(async()=>{try{const r=await request<{revision:number}>(`/api/attempts/${aid}/study`,{action:'navigate',sectionId,panels:selection,revision:workspaceRevision});workspaceRevision=r.revision;if(sectionId===section.id&&JSON.stringify(selection)===JSON.stringify(panels)){positionDirty=false;cache();}}catch(e){message=(e as Error).message;}finally{positionSaving--;}});return positionPromise;
 }
 function selectPanel(id:string){if(!image)return;panels={...panels,[image.id]:id};positionDirty=true;cache();clearTimeout(positionTimer);positionTimer=setTimeout(()=>void savePosition(),350);}
 function focusTask(task:Task){if(task.imageId&&task.panelId&&panels[task.imageId]!==task.panelId){panels={...panels,[task.imageId]:task.panelId};cache();clearTimeout(positionTimer);positionTimer=setTimeout(()=>void savePosition(),500);}}
 async function move(index:number){await flush();sectionIndex=index;positionDirty=true;cache();await savePosition();await tick();sectionHeading?.focus();sectionHeading?.scrollIntoView({block:'start'});}
 async function check(task:Task){if(checking||!attempt)return;checking=task.id;try{if(!await flush())return;const q=questionFor(task)!;const c=await request<Check>(`/api/attempts/${attempt.id}/check`,{questionId:q.id,revision:revisions[q.id],requestId:crypto.randomUUID()});if(!checks.some(x=>x.questionId===q.id&&x.answerRevision===c.answerRevision))checks=[...checks,c];}catch(e){message=(e as Error).message;}finally{checking='';}}
 function feedback(task:Task){const q=questionFor(task);if(!q)return null;if(submitted){const a=attempt?.answers.find(a=>a.questionId===q.id);return a?{reviewStatus:a.reviewStatus,earnedPoints:a.earnedPoints,feedback:q.feedback??a.feedback??undefined}:null;}return checks.findLast(c=>c.questionId===q.id&&c.response===drafts[task.id]&&c.answerRevision===revisions[q.id])??null;}
 async function start(){busy=true;try{const r=await request<{id:string}>(`/api/lessons/${data.lesson.id}/attempts`,{});await goto(`/learn/${data.lesson.id}?attempt=${r.id}`,{refreshAll:true});}catch(e){message=(e as Error).message;}finally{busy=false;}}
 async function submit(){if(!attempt||busy)return;busy=true;try{if(!await flush())return;await request(`/api/attempts/${attempt.id}/submit`,{});try{localStorage.removeItem(key);}catch{}await invalidateAll();review=false;}catch(e){message=(e as Error).message;}finally{busy=false;}}
 async function switchLesson(e:MouseEvent,href:string){e.preventDefault();await flush();await savePosition();navigationDialog?.close();await goto(href);}
 async function reviewTask(task:Task){review=false;await move(content.sections.findIndex(s=>s.items.some(i=>i.id===task.id)));await tick();document.getElementById(task.id)?.scrollIntoView({block:'center'});}
</script>
<svelte:head><title>{content.number} · {content.title} · English with Jonah</title></svelte:head>
<div class="learning-page">
 <div class="learning-top"><a href="/home" onclick={e=>switchLesson(e,'/home')}>← Bosh sahifa</a><span>UNIT 1 · TO BE</span><a href="/ranking" onclick={e=>switchLesson(e,'/ranking')}>Ranking</a><button class="mobile-lessons" onclick={()=>navigationDialog.showModal()}>Darslar ☰</button></div>
 <div class="learning-workspace">
  <aside class="lesson-sidebar"><p class="eyebrow">BIRINCHI BO‘LIM</p><h2>To Be</h2><p class="sidebar-progress">{data.unit.finished} / 5 dars tugallangan<br />{data.unit.points} / {data.unit.maximumPoints} coin</p><nav aria-label="Unit 1 darslari">{#each data.unit.lessons as l}<a href={l.href} aria-current={l.id===data.lesson.id?'page':undefined} onclick={e=>switchLesson(e,l.href)}><span class="sidebar-number">1.{l.position}</span><span>{l.title.split(' · ').at(-1)}<small>{l.mastered?'★ O‘zlashtirilgan':l.completed?'✓ Tugallangan':l.kind==='final_exam'?'20 topshiriq · 24 ball':`${l.id===data.lesson.id?Math.max(l.taskDone,completed):l.taskDone} / 24 topshiriq`}</small></span></a>{/each}</nav><p class="sidebar-note">Har bir darsning lug‘atiga alohida tayyorlanishingiz mumkin.</p></aside>
  <div class="lesson-main">
   <header class="lesson-title"><div><p class="eyebrow">{exam?'YAKUNIY TEST':'DARS'} {content.number}</p><h1>{content.title}</h1></div>{#if !exam||submitted}<button class="button button--secondary" onclick={()=>vocabDialog.showModal()}>Lug‘at ↗</button>{/if}</header>
   {#if message}<div class="feedback feedback--error save-error" role="alert"><p>{message}</p><button class="button button--secondary" onclick={()=>{void flush();void savePosition();}}>Qayta saqlash</button><a href={page.url.pathname+page.url.search}>Serverdan qayta yuklash</a></div>{/if}
   {#if prep}<VocabularyPrep lesson={content} lessonId={data.lesson.id} {ready} hasSession={!!data.vocabularySession} mastered={data.lesson.vocabularyMastered} onready={()=>{ready=true;void invalidateAll();}} onstart={start} {busy} needsLessons={data.lesson.needsLessons} />
   {:else if attempt}
    <div class="lesson-status"><span class="save-state" role="status">{saving||positionSaving?'● Saqlanmoqda…':dirty.length?'○ Qurilmada saqlangan':submitted?'✓ Topshirilgan':'✓ Javoblar saqlangan'}</span><span>{exam?`${tasks.length-unanswered.length} / 20 javob`:`${completed} / 24 topshiriq`}</span></div>
    {#if submitted}<section class="lesson-result"><p class="reward-status">{exam?(data.unit.mastered?'★ Bo‘lim o‘zlashtirilgan · har bir dars uchun 10 coin olingan':attempt.pendingReview?'Coin baholash yakunlangach beriladi.':'90% natija: har bir tugallangan darsga +10 coin.'):data.lesson.mastered?'★ Dars o‘zlashtirilgan · 60 coin olingan':data.lesson.completed?'✓ Dars tugallangan · 50 coin olingan':attempt.pendingReview?'Coin baholash yakunlangach beriladi.':'Dars tugallanganda bir marta 50 coin beriladi.'}</p><p class="eyebrow">{attempt.pendingReview?'DASTLABKI NATIJA':'YAKUNIY NATIJA'}</p><h2>{attempt.earnedPoints} / {attempt.maxPoints} ball</h2><p>{attempt.pendingReview?'Yozma javob yoki tugallanmagan tinglash o‘qituvchi baholashini kutmoqda. Jami ball hali yakuniy emas.':'Javoblaringiz saqlandi. Quyida xatolarni ko‘rib chiqing.'}</p>{#if exam}<p>{(attempt.earnedPoints??0)>=20?'20–24 ball: yaxshi natija; xatolarni ko‘rib chiqing.':(attempt.earnedPoints??0)>=16?'16–19 ball: xato qilingan mavzularni takrorlang.':'0–15 ball: kerakli darslarga qaytib, yana mashq qiling.'}</p><details><summary>Takrorlash uchun</summary><p>1.1: 1, 4, 5<br />1.2: 2, 10, 12, 18<br />1.3: 6, 17<br />1.4: 3, 7, 8, 15, 16, 20<br />1.5: 9, 11, 13, 14, 19</p><p>Tinglashdagi xatolar uchun audioni matn bilan, keyin yana matnsiz tinglang.</p></details>{/if}<button class="button button--secondary" disabled={busy} onclick={start}>Yangi urinish</button></section>{/if}
    <nav class="section-steps" aria-label="Dars bo‘limlari">{#each content.sections as s,i}<button aria-current={i===sectionIndex?'step':undefined} onclick={()=>move(i)} aria-label={`${i+1}. ${s.title}`}><span>{i+1}</span><small>{s.title.toLocaleLowerCase('uz-Latn')}</small></button>{/each}</nav>
    <div class="section-heading-row"><div><p class="eyebrow">{sectionIndex+1} / {content.sections.length} BO‘LIM</p><h2 bind:this={sectionHeading} tabindex="-1">{section.title}</h2></div></div>
    <section class:has-illustration={!!image} class="authored-section" aria-label={section.title}>
     {#if image}<div class="section-picture">{#key image.id}<LessonIllustration bind:this={illustration} {image} selected={panels[image.id]??firstTask?.panelId??(image.panels[0]?.id)} onselect={selectPanel} />{/key}</div>{/if}
     <div class="section-material">{#each section.items as item}
      {#if item.kind==='text'}<div class="lesson-text" id={item.id}>{#each item.text.split('\n') as line}<p>{line}</p>{/each}</div>
      {:else if item.kind==='audio'}{#key attempt.id+'-'+section.id}<LessonAudio attemptId={attempt.id} {exam} {submitted} initialPlays={audioPlays} initialStatus={audioStatus} onstate={(plays,status)=>{audioPlays=plays;audioStatus=status;}} />{/key}
      {:else}<LessonTask task={item} value={drafts[item.id]??'{}'} onchange={value=>change(item,value)} oncheck={()=>check(item)} onfocus={()=>focusTask(item)} onimage={async()=>{focusTask(item);await tick();await illustration?.open();}} feedback={feedback(item)} disabled={submitted} busy={checking===item.id} {exam} />{/if}
     {/each}{#if !exam&&sectionIndex===content.sections.length-1}<details class="speaking-selfcheck"><summary>Ovoz chiqarib mashq qildim</summary><p>Gaplaringizni yolg‘iz ayting va matn bilan solishtiring. Bu mashqda talaffuz avtomatik baholanmaydi.</p><label><input type="checkbox" /> Gaplarimni ovoz chiqarib aytdim.</label></details>{/if}</div>
    </section>
    <div class="lesson-bottom"><button class="button button--secondary" disabled={sectionIndex===0} onclick={()=>move(sectionIndex-1)}>← Oldingi</button><span>{sectionIndex+1} / {content.sections.length}</span>{#if sectionIndex<content.sections.length-1}<button class="button button--primary" onclick={()=>move(sectionIndex+1)}>Davom etish →</button>{:else if !submitted}<button class="button button--primary" onclick={()=>review=true}>{exam?'Testni ko‘rib chiqish':'Darsni yakunlash'}</button>{:else}<a class="button button--primary" href="/home">Bosh sahifa →</a>{/if}</div>
    {#if review}<section class="submission-review" aria-label="Topshirishdan oldin"><h2>Javoblarni ko‘rib chiqing</h2><p>{unanswered.length?`${unanswered.length} ta topshiriq to‘liq javobsiz.`:'Barcha topshiriqlarga javob yozilgan.'} {exam?'Topshirgandan keyin javoblarni o‘zgartirib bo‘lmaydi.':'Shaxsiy javoblarni o‘qituvchi tekshiradi.'}</p><div class="review-grid">{#each tasks as task}<button class:unanswered={!filled(task)} onclick={()=>reviewTask(task)} aria-label={`${task.number}-topshiriq: ${filled(task)?'javob berilgan':'javobsiz'}`}>{task.number}{filled(task)?' ✓':' ○'}</button>{/each}</div><div class="prep-actions"><button class="button button--secondary" onclick={()=>review=false}>Davom ettirish</button><button class="button button--primary" disabled={busy||saving} onclick={submit}>{busy?'Topshirilmoqda…':exam?'Testni topshirish':'Javoblarni topshirish'}</button></div></section>{/if}
   {/if}
  </div>
 </div>
</div>
<dialog class="lesson-drawer" bind:this={navigationDialog} aria-label="Dars tanlash"><div class="drawer-heading"><h2>Unit 1 · To Be</h2><button class="button button--secondary" onclick={()=>navigationDialog.close()}>Yopish ×</button></div><nav>{#each data.unit.lessons as l}<a href={l.href} aria-current={l.id===data.lesson.id?'page':undefined} onclick={e=>switchLesson(e,l.href)}>{l.title}<small>{l.mastered?'★ O‘zlashtirilgan':l.completed?'✓ Tugallangan':l.kind==='lesson'?`${l.taskDone} / 24 topshiriq`:'20 topshiriq · 24 ball'}</small></a>{/each}</nav></dialog>
<dialog class="vocab-dialog" bind:this={vocabDialog} aria-label="Lug‘at"><div class="drawer-heading"><h2>Vocab {content.number}</h2><button class="button button--primary" onclick={()=>vocabDialog.close()}>Yopish ×</button></div>{#if !exam}<a class="button button--secondary" href={`/learn/${data.lesson.id}?vocab`} onclick={e=>{vocabDialog.close();void switchLesson(e,`/learn/${data.lesson.id}?vocab`);}}>Lug‘at testi {data.lesson.vocabularyMastered?'· O‘zlashtirilgan':'· +30 coin'} →</a>{/if}<dl class="vocabulary-list">{#each content.vocabulary as word}<div><dt lang="en">{word.english}</dt><dd>{word.uzbek}</dd></div>{/each}</dl></dialog>
