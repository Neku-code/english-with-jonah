<script lang="ts">
 import {tick} from 'svelte';
 import type {Task} from '#lib/learning/types.ts';
 import {unpack} from '#lib/learning/response.ts';
 let {task,value,onchange,oncheck,onfocus,onimage=()=>{},feedback,disabled=false,busy=false,exam=false}:{task:Task;value:string;onchange:(value:string)=>void;oncheck:()=>void;onfocus:()=>void;onimage?:()=>void;feedback?:{reviewStatus:string;earnedPoints:number|null;feedback?:string;notes?:string}|null;disabled?:boolean;busy?:boolean;exam?:boolean}=$props();
 const parts=$derived(unpack(value));
 const order=$derived(Array.isArray(parts._order)?parts._order:[]);
 function set(id:string,v:string|string[]){onchange(JSON.stringify({...parts,[id]:v}));}
 function selectToken(id:string){const next=order.includes(id)?order.filter(x=>x!==id):[...order,id];arrange(next);}
 function arrange(next:string[]){onchange(JSON.stringify({...parts,_order:next,[task.parts[0].id]:next.map(id=>task.tokens?.find(t=>t.id===id)?.label??'').join(' ')}));}
 async function move(e:KeyboardEvent,id:string){if(!e.shiftKey||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const next=[...order],i=next.indexOf(id),j=i+(e.key==='ArrowLeft'?-1:1);if(j<0||j>=next.length)return;[next[i],next[j]]=[next[j],next[i]];arrange(next);await tick();document.getElementById(id+'-chosen')?.focus();}
 const hasAnswer=$derived(task.parts.every(p=>typeof parts[p.id]==='string'?(parts[p.id] as string).trim():Array.isArray(parts[p.id])&&(parts[p.id] as string[]).length));
</script>
<article class="learning-task" id={task.id} onfocusin={onfocus} aria-labelledby={`${task.id}-title`}>
 <div class="task-heading"><span class="task-number">{task.number.toString().padStart(2,'0')}</span><h3 id={`${task.id}-title`}>{task.prompt}</h3>{#if exam}<small>{task.maxPoints} ball</small>{/if}</div>
 {#if task.imageId}<button class="task-picture-link" onclick={onimage}>⤢ Tegishli rasmni ko‘rish</button>{/if}
 {#if task.control==='choice'||task.control==='multi'}
  <fieldset disabled={disabled}><legend class="visually-hidden">{task.control==='multi'?'Ikkita javobni tanlang':'Javobni tanlang'}</legend>{#each task.options??[] as option}
   <label class="answer-option"><input type={task.control==='multi'?'checkbox':'radio'} name={task.id} value={option.id} checked={task.control==='multi'?(parts[task.parts[0].id]??[]).includes(option.id):parts[task.parts[0].id]===option.id} onchange={()=>{if(task.control==='choice')set(task.parts[0].id,option.id);else {const current=(parts[task.parts[0].id]??[]) as string[];set(task.parts[0].id,current.includes(option.id)?current.filter(x=>x!==option.id):[...current,option.id]);}}} /><span><small>{option.id}</small>{option.label}</span></label>
  {/each}</fieldset>
 {:else if task.control==='order'}
  <p class="task-help">So‘zlarni kerakli tartibda bosing. Joyini o‘zgartirish: Shift + ← / →.</p>
  <div class="ordered-answer" aria-label="Tuzilgan gap">{#each order as id}<button id={`${id}-chosen`} disabled={disabled} class="word-token chosen" onclick={()=>selectToken(id)} onkeydown={e=>move(e,id)} aria-label={`${task.tokens?.find(t=>t.id===id)?.label} — olib tashlash yoki joyini o‘zgartirish`}>{task.tokens?.find(t=>t.id===id)?.label}<span aria-hidden="true"> ×</span></button>{/each}{#if !order.length}<span class="muted">Gap shu yerda tuziladi.</span>{/if}</div>
  <div class="word-bank">{#each task.tokens??[] as token}<button class="word-token" disabled={disabled||order.includes(token.id)} onclick={()=>selectToken(token.id)}>{token.label}</button>{/each}</div>
 {:else}
  {#each task.parts as part}<div class="learning-field"><label for={part.id}>{part.label}</label>{#if task.control==='written'||task.parts.length>1}<textarea id={part.id} lang="en" rows="2" maxlength="2000" autocapitalize="sentences" spellcheck="false" disabled={disabled} value={String(parts[part.id]??'')} oninput={e=>set(part.id,e.currentTarget.value)}></textarea>{:else}<input id={part.id} lang="en" type="text" maxlength="2000" autocomplete="off" spellcheck="false" disabled={disabled} value={String(parts[part.id]??'')} oninput={e=>set(part.id,e.currentTarget.value)} />{/if}</div>{/each}
 {/if}
 {#if !exam&&!disabled}<button class="button button--primary task-check" disabled={!hasAnswer||busy} onclick={oncheck}>{busy?'Tekshirilmoqda…':feedback?'Qayta tekshirish':'Tekshirish'}</button>{/if}
 {#if feedback}<div class:answer-pending={feedback.reviewStatus==='pending'} class:answer-wrong={feedback.reviewStatus==='graded'&&feedback.earnedPoints!==task.maxPoints} class="answer-feedback" role="status"><strong>{feedback.reviewStatus==='pending'?'O‘qituvchi baholashi kutilmoqda':feedback.earnedPoints===task.maxPoints?'✓ To‘g‘ri':`${exam?'Natija':'Yana urinib ko‘ring'} · ${feedback.earnedPoints} / ${task.maxPoints}`}</strong>{#if feedback.feedback}<p>{feedback.feedback}</p>{/if}{#if feedback.notes}<details><summary>Qisqa izoh</summary><p>{feedback.notes}</p></details>{/if}</div>{/if}
</article>
