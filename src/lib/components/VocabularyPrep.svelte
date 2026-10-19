<script lang="ts">
 import {onMount} from 'svelte';
 import type {LessonContent} from '#lib/learning/types.ts';
 import {request} from '#lib/learning/client.ts';
 let {lesson,lessonId,ready,mastered=false,hasSession=false,onready,onstart,busy=false,needsLessons=false}:{lesson:LessonContent;lessonId:string;ready:boolean;mastered?:boolean;hasSession?:boolean;onready:()=>void;onstart:()=>Promise<void>;busy?:boolean;needsLessons?:boolean}=$props();
 type Session={id:string;words:{id:string;english:string}[];responses:{id:string;response:string;correct:boolean}[]};
 type Feedback={correct:boolean;expected:string;done:boolean;passed:boolean;score:number;total:number;coinsAwarded:number};
 let session=$state<Session|null>(null),answer=$state(''),working=$state(false),message=$state(''),feedback=$state<Feedback|null>(null),showExam=$state(false);
 const current=$derived(session?.words[session.responses.length]);
 async function start(){working=true;message='';feedback=null;answer='';try{session=await request<Session>(`/api/lessons/${lessonId}/vocabulary`,{action:'start'});showExam=true;}catch(e){message=(e as Error).message;}finally{working=false;}}
 onMount(()=>{if(hasSession)void start();});
 async function reviewed(){
  if(working||busy)return;working=true;message='';
  try{if(!ready&&lesson.kind!=='exam'){await request(`/api/lessons/${lessonId}/vocabulary`,{action:'review'});onready();}await onstart();}
  catch(e){message=(e as Error).message;}finally{working=false;}
 }
 async function submit(e:SubmitEvent){e.preventDefault();if(!session||!current||working)return;working=true;message='';try{
  const result=await request<Feedback&{responses:Session['responses']}>(`/api/lessons/${lessonId}/vocabulary`,{action:'answer',sessionId:session.id,wordId:current.id,response:answer});
  session={...session,responses:result.responses};feedback=result;if(result.done&&result.passed)onready();
 }catch(e){message=(e as Error).message;}finally{working=false;}}
</script>
<section class="vocabulary-prep">
 <p class="eyebrow">DARS OLDIDAN · VOCAB {lesson.number}</p><h2>{lesson.kind==='exam'?'Lug‘atni takrorlang':'Avval so‘zlar bilan tanishing'}</h2>
 <p class="intro">{lesson.kind==='exam'?'Testda yangi so‘zlar yo‘q.':`So‘zlarni o‘rganing va “Ko‘rib chiqdim” tugmasi bilan darsni oching. Lug‘atni o‘zlashtirish uchun ${Math.ceil(lesson.vocabulary.length/3)} ta so‘zning tarjimasini yozing. Kamida 75% natija: +30 coin.`}</p>
 <div class="prep-actions">
  <button class="button button--primary" disabled={busy||working||needsLessons} onclick={reviewed}>{busy||working?'Kutilmoqda…':lesson.kind==='exam'?'Testni boshlash':ready?'Darsni ochish →':'Ko‘rib chiqdim'}</button>
  {#if lesson.kind!=='exam'}<button class="button button--secondary" disabled={working||busy} onclick={start}>{mastered?'Testni qayta topshirish':hasSession?'Testni davom ettirish':'Test topshirish'}</button>{/if}
 </div>
 {#if needsLessons}<p class="notice">Yakuniy testdan oldin 1.1–1.5 darslarni tugating. Baholash kutilayotgan yozma javoblarni o‘qituvchi tekshiradi.</p>{/if}
 {#if message}<p class="feedback feedback--error" role="alert">{message}</p>{/if}
 {#if lesson.kind!=='exam'}
  {#if mastered}<p class="feedback">★ Lug‘at o‘zlashtirilgan · 30 coin olingan. Qayta topshirish qo‘shimcha coin bermaydi.</p>
  {:else if ready}<p class="feedback">✓ Lug‘at ko‘rib chiqilgan · Dars ochiq. Test topshirib, 30 coin olishingiz mumkin.</p>{/if}
 {/if}
 {#if showExam&&session}<div class="vocab-exam">
  <button class="button button--secondary" onclick={()=>showExam=false}>← So‘zlar ro‘yxati</button>
  <p class="eyebrow">{session.responses.length} / {session.words.length} JAVOB SAQLANGAN</p>
  {#if feedback}<div class="answer-feedback" class:answer-wrong={!feedback.correct} role="status"><strong>{feedback.correct?'✓ To‘g‘ri':'Tarjimani eslab qoling'}</strong><p>{feedback.expected}</p></div>
   {#if feedback.done}<h3>{feedback.score} / {feedback.total} · {feedback.passed?'★ Lug‘at o‘zlashtirildi':'Yana tayyorlaning'}</h3>
    <p role="status">{feedback.coinsAwarded?`+${feedback.coinsAwarded} coin!`:feedback.passed?'Bu lug‘at uchun coin avval olingan.':'75% natija uchun tayyorlanib, yana urinib ko‘ring. Darsingiz ochiq bo‘lsa, ochiq qoladi.'}</p>
    {#if !feedback.passed}<button class="button button--primary" disabled={working} onclick={start}>Qayta urinish</button>{/if}
   {:else}<button class="button button--primary" onclick={()=>{feedback=null;answer='';}}>Keyingi so‘z →</button>{/if}
  {:else if current}<form onsubmit={submit}><h3 lang="en">{current.english}</h3><div class="learning-field"><label for="vocab-answer">O‘zbekcha tarjima</label><input id="vocab-answer" bind:value={answer} autocomplete="off" required /></div><button class="button button--primary" disabled={working||!answer.trim()}>{working?'Saqlanmoqda…':'Tekshirish'}</button></form>{/if}
 </div>{:else}<dl class="vocabulary-list">{#each lesson.vocabulary as word}<div><dt lang="en">{word.english}</dt><dd>{word.uzbek}</dd></div>{/each}</dl>{/if}
</section>
