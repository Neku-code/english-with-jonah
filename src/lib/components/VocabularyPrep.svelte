<script lang="ts">
 import {onMount} from 'svelte';
 import type {LessonContent} from '#lib/learning/types.ts';
 import {request} from '#lib/learning/client.ts';
 let {lesson,lessonId,ready,hasSession=false,onpassed,onstart,busy=false,needsLessons=false}:{lesson:LessonContent;lessonId:string;ready:boolean;hasSession?:boolean;onpassed:()=>void;onstart:()=>void;busy?:boolean;needsLessons?:boolean}=$props();
 type Session={id:string;words:{id:string;english:string}[];responses:{id:string;response:string;correct:boolean}[]};
 let session=$state<Session|null>(null),answer=$state(''),working=$state(false),message=$state(''),feedback=$state<{correct:boolean;expected:string;done:boolean;passed:boolean;score:number;total:number}|null>(null),showExam=$state(false);
 const current=$derived(session?.words[session.responses.length]);
 async function start(){working=true;message='';feedback=null;try{session=await request<Session>(`/api/lessons/${lessonId}/vocabulary`,{action:'start'});showExam=true;}catch(e){message=(e as Error).message;}finally{working=false;}}
 onMount(()=>{if(hasSession)void start();});
 async function submit(e:SubmitEvent){e.preventDefault();if(!session||!current||working)return;working=true;try{
  const result=await request<{correct:boolean;expected:string;responses:Session['responses'];done:boolean;passed:boolean;score:number;total:number}>(`/api/lessons/${lessonId}/vocabulary`,{action:'answer',sessionId:session.id,wordId:current.id,response:answer});
  session={...session,responses:result.responses};feedback=result;if(result.done&&result.passed)onpassed();
 }catch(e){message=(e as Error).message;}finally{working=false;}}
</script>
<section class="vocabulary-prep">
 <p class="eyebrow">DARS OLDIDAN · VOCAB {lesson.number}</p><h2>{lesson.kind==='exam'?'Lug‘atni takrorlang':'Avval so‘zlar bilan tanishing'}</h2>
 <p class="intro">{lesson.kind==='exam'?'Testda yangi so‘zlar yo‘q.':`So‘zlarni o‘rganing. Keyin ${Math.ceil(lesson.vocabulary.length/3)} ta inglizcha so‘zning o‘zbekcha tarjimasini yozing. Kamida 75% natija darsni ochadi.`}</p>
 <div class="prep-actions"><button class="button button--secondary" onclick={()=>showExam=false}>Lug‘at ro‘yxati</button>{#if lesson.kind!=='exam'}<button class="button button--secondary" disabled={working} onclick={start}>{hasSession?'Lug‘at sinovini davom ettirish':'Lug‘at sinovi'}</button>{/if}{#if ready||lesson.kind==='exam'}<button class="button button--primary" disabled={busy||needsLessons} onclick={onstart}>{busy?'Ochilmoqda…':lesson.kind==='exam'?'Testni boshlash':'Darsni boshlash →'}</button>{/if}</div>
 {#if needsLessons}<p class="notice">Yakuniy testdan oldin 1.1–1.5 darslarni tugating. Baholash kutilayotgan yozma javoblarni o‘qituvchi tekshiradi.</p>{/if}
 {#if message}<p class="feedback feedback--error" role="alert">{message}</p>{/if}
 {#if ready&&lesson.kind!=='exam'}<p class="feedback">✓ Lug‘at bosqichidan o‘tgansiz. Darsni boshlashingiz mumkin.</p>{/if}
 {#if showExam&&session}<div class="vocab-exam">
  <p class="eyebrow">{session.responses.length} / {session.words.length} JAVOB SAQLANGAN</p>
  {#if feedback}<div class="answer-feedback" class:answer-wrong={!feedback.correct} role="status"><strong>{feedback.correct?'✓ To‘g‘ri':'Tarjimani eslab qoling'}</strong><p>{feedback.expected}</p></div>{#if feedback.done}<h3>{feedback.score} / {feedback.total} · {feedback.passed?'Lug‘at sinovidan o‘tdingiz':'Yana tayyorlaning'}</h3>{#if !feedback.passed}<button class="button button--primary" onclick={start}>Qayta urinish</button>{/if}{:else}<button class="button button--primary" onclick={()=>{feedback=null;answer='';}}>Keyingi so‘z →</button>{/if}
  {:else if current}<form onsubmit={submit}><h3 lang="en">{current.english}</h3><div class="learning-field"><label for="vocab-answer">O‘zbekcha tarjima</label><input id="vocab-answer" bind:value={answer} autocomplete="off" required /></div><button class="button button--primary" disabled={working||!answer.trim()}>{working?'Saqlanmoqda…':'Tekshirish'}</button></form>{/if}
 </div>{:else}<dl class="vocabulary-list">{#each lesson.vocabulary as word}<div><dt lang="en">{word.english}</dt><dd>{word.uzbek}</dd></div>{/each}</dl>{/if}
</section>
