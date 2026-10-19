<script lang="ts">
 import {onMount,onDestroy} from 'svelte';
 import {beforeNavigate} from '$app/navigation';
 import {request} from '#lib/learning/client.ts';
 let {attemptId,exam=false,submitted=false,initialPlays=0,initialStatus='idle',onstate=()=>{}}:{attemptId:string;exam?:boolean;submitted?:boolean;initialPlays?:number;initialStatus?:string;onstate?:(plays:number,status:string)=>void}=$props();
 let voices=$state<SpeechSynthesisVoice[]>([]),loading=$state(true),playing=$state(false),busy=$state(false),plays=$state(0),status=$state('idle'),message=$state(''),transcript=$state<{speaker:string;text:string}[]>([]);
 let generation=0;let utterance:SpeechSynthesisUtterance|null=null;
 function stop(){generation++;playing=false;if(typeof window!=='undefined'&&'speechSynthesis' in window)window.speechSynthesis.cancel();}
 beforeNavigate(()=>stop());onDestroy(stop);
 onMount(()=>{
  plays=initialPlays;status=initialStatus;
  if(!('speechSynthesis' in window)){loading=false;message='Bu brauzerda ovoz ishlamaydi. Tinglash tugallanmagan holda saqlanadi.';return;}
  const load=()=>{voices=speechSynthesis.getVoices().filter(v=>/^en(?:-|_)/i.test(v.lang));if(voices.length)loading=false;};load();speechSynthesis.addEventListener('voiceschanged',load);
  const timer=setTimeout(()=>{loading=false;if(!voices.length)message='Inglizcha ovoz topilmadi. Qurilmangizda inglizcha ovozni yoqing yoki boshqa brauzerda urinib ko‘ring.';},5000);
  return()=>{clearTimeout(timer);speechSynthesis.removeEventListener('voiceschanged',load);};
 });
 const endpoint=$derived(`/api/attempts/${attemptId}/study`);
 async function failed(){playing=false;status='failed';onstate(plays,status);try{await request(endpoint,{action:'audio-failed',requestId:crypto.randomUUID()});}catch(e){message=(e as Error).message;}}
 async function play(){
  if(busy||playing)return;busy=true;message='';stop();
  if(!voices.length){message='Ovoz mavjud emas. Tinglash tugallanmagan; uning ballari o‘qituvchi tekshiruvini kutadi.';await failed();busy=false;return;}
  const playId=crypto.randomUUID();
  try{
   const result=await request<{turns:{speaker:string;text:string}[];plays:number}>(endpoint,{action:'play',requestId:playId});plays=result.plays;onstate(plays,status);
   const run=++generation;playing=true;busy=false;
   const speak=(i:number)=>{
    if(run!==generation)return;
    if(i>=result.turns.length){playing=false;status='completed';onstate(plays,status);request(endpoint,{action:'audio-complete',playId,requestId:crypto.randomUUID()}).catch(e=>message=(e as Error).message);return;}
    const turn=result.turns[i];utterance=new SpeechSynthesisUtterance(turn.text);utterance.lang='en-US';utterance.voice=voices[(turn.speaker==='Ben'?1:0)%voices.length];utterance.rate=.88;
    utterance.onend=()=>speak(i+1);utterance.onerror=()=>{if(run===generation){message='Ovoz ijro etilmadi. Tinglash tugallanmagan holda saqlandi.';void failed();}};
    speechSynthesis.speak(utterance);
   };speak(0);
  }catch(e){message=(e as Error).message;busy=false;playing=false;}
 }
 async function support(){try{const r=await request<{turns:{speaker:string;text:string}[]}>(endpoint,{action:'transcript',requestId:crypto.randomUUID()});transcript=r.turns;}catch(e){message=(e as Error).message;}}
</script>
<div class="lesson-audio">
 <div><span class="eyebrow">TINGLASH</span><h3>Bitta suhbat, diqqat bilan tinglang</h3><p class="task-help">Brauzerning inglizcha ovozi. {exam&&!submitted?`${Math.max(0,2-plays)} / 2 tinglash qoldi.`:'Qayta tinglashingiz mumkin.'}</p></div>
 <div class="audio-actions"><button class="button button--primary" disabled={loading||busy||playing||(exam&&!submitted&&plays>=2)} onclick={play}>{loading?'Ovoz yuklanmoqda…':busy?'Tayyorlanmoqda…':playing?'Tinglanmoqda…':'▶ Tinglash'}</button><button class="button button--secondary" disabled={!playing} onclick={stop}>To‘xtatish</button></div>
 {#if status==='completed'}<p class="task-help">✓ Tinglash tugallandi.</p>{/if}
 {#if message}<p class="feedback feedback--error" role="alert">{message}</p>{/if}
 {#if !exam||submitted}<button class="transcript-link" onclick={support}>Matn bilan yordam {#if !submitted}(ishlatilgani saqlanadi){/if}</button>{/if}
 {#if transcript.length}<div class="transcript" lang="en">{#each transcript as turn}<p><strong>{turn.speaker}:</strong> {turn.text}</p>{/each}</div>{/if}
</div>
