<script lang="ts">
 import {tick} from 'svelte';
 import type {LessonImage,Illustration} from '#lib/learning/types.ts';
 let {image,selected,onselect}:{image:LessonImage;selected?:string;onselect:(id:string)=>void}=$props();
 let dialog:HTMLDialogElement;let zoom=$state(1);let viewerOpen=$state(false);let opener:HTMLElement|null=null;
 const panel=$derived(image.panels.find(p=>p.id===selected));
 const active=$derived(panel??image);
 const srcset=(i:Illustration)=>i.variants.map(v=>`${v.url} ${v.width}w`).join(', ');
 export async function open(){opener=document.activeElement instanceof HTMLElement?document.activeElement:null;zoom=1;viewerOpen=true;await tick();dialog.showModal();dialog.querySelector<HTMLButtonElement>('[data-close]')?.focus();}
 function close(){dialog.close();opener?.focus();}
</script>
<figure class="lesson-figure">
 {#if image.panels.length}<div class="panel-tabs" aria-label="Rasm qismlari">{#each image.panels as p}<button type="button" aria-pressed={p.id===panel?.id} onclick={()=>onselect(p.id)}>{p.label}</button>{/each}<button type="button" aria-pressed={!panel} onclick={()=>onselect('overview')}>Hammasi</button></div>{/if}
 <button class="image-open" onclick={open} aria-label="Rasmni kattalashtirish"><img src={active.url} srcset={srcset(active)} sizes="(min-width:1100px) 440px, (min-width:768px) 620px, calc(100vw - 48px)" width={active.width} height={active.height} alt={active.alt} fetchpriority="high" /><span aria-hidden="true">⤢ Kattalashtirish</span></button>
 <figcaption>{#if panel?.model}<p lang="en">{panel.model}</p>{:else if !panel}{#each image.models as model}<p lang="en">{model}</p>{/each}{/if}<small>Rasmni bosib kattalashtiring.</small></figcaption>
</figure>
<dialog class="image-dialog" bind:this={dialog} onclose={()=>{viewerOpen=false;opener?.focus();}} aria-label="Kattalashtirilgan rasm">
 <div class="viewer-toolbar"><span>{panel?.label??'To‘liq rasm'}</span><div><button class="button button--secondary" onclick={()=>zoom=Math.max(1,zoom-.5)} disabled={zoom<=1} aria-label="Kichraytirish">−</button><button class="button button--secondary" onclick={()=>zoom=Math.min(4,zoom+.5)} disabled={zoom>=4} aria-label="Kattalashtirish">+</button><button class="button button--primary" data-close onclick={close}>Yopish ×</button></div></div>
 <div class="viewer-scroll">{#if viewerOpen}<img src={active.url} width={active.width} height={active.height} style:width={`${zoom*100}%`} alt={active.alt} />{/if}</div>
 <p class="viewer-help">Siljiting yoki ikki barmoq bilan kattalashtiring. {Math.round(zoom*100)}%</p>
</dialog>
