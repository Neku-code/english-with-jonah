<script lang="ts">
  import type { QuestionContent } from '#lib/server/learning/contracts';
  import { safeMediaUrl } from '#lib/admin-format.ts';
  let { content, versionContent = {} }: { content: QuestionContent | null; versionContent?: Record<string, unknown> } = $props();
  let original = $derived(versionContent as Partial<import('../learning/types').LessonContent>);
  let task = $derived(content?.task);
  let section = $derived(original.sections?.find(s => s.items?.some(i => i.id === task?.id)));
  let illustration = $derived(original.images?.find(i => i.id === task?.imageId || i.id === section?.imageId));
  let panel = $derived(task?.panelId ? illustration?.panels?.find(p => p.id === task.panelId) : null);
  let picture = $derived(panel ?? illustration);
</script>
{#if content?.prompt}<p class="question-prompt">{content.prompt}</p>
{:else}<p class="feedback">Asl savol matni mavjud emas. Saqlangan javob quyida ko‘rsatilgan.</p>{/if}
{#if content?.options}<ul>{#each content.options as option}<li><code>{option.id}</code> — {option.label}</li>{/each}</ul>{/if}
{#if task}
  {#if section}<details class="grading-details"><summary>Asl darsdagi kontekst</summary><h3>{section.title}</h3>{#each section.items ?? [] as item}{#if item.kind === 'text'}<p class="question-prompt">{item.text}</p>{/if}{/each}</details>{/if}
  {#if picture && safeMediaUrl(picture.url)}<img class="question-media" src={safeMediaUrl(picture.url)} alt={picture.alt ?? 'Savol rasmi'} loading="lazy" referrerpolicy="no-referrer" />{/if}
  <ul>{#each task.parts as part}<li><span class="mono">{part.id}</span> — {part.label}</li>{/each}</ul>
  {#if task.options}<ul>{#each task.options as option}<li>{option.id} — {option.label}</li>{/each}</ul>{/if}
  {#if task.tokens}<p>{task.tokens.map(t => t.label).join(' · ')}</p>{/if}
  {#if task.listening}<p class="muted">Savol tinglash materialiga tegishli. Asl saqlangan audio ma’lumoti quyida.</p>{#if original.audioId}<p class="mono">Audio: {original.audioId}</p>{/if}{/if}
{/if}
{#each content?.media ?? [] as media}
  {@const url = safeMediaUrl(media.url)}
  {#if url}
    {#if media.kind === 'image'}<img class="question-media" src={url} alt={media.alt ?? 'Savolga biriktirilgan rasm'} loading="lazy" referrerpolicy="no-referrer" />
    {:else if media.kind === 'audio'}<audio controls src={url} preload="none"><track kind="captions" />Audio yozuvni tinglash.</audio>
    {:else if media.kind === 'video'}<a href={url} target="_blank" rel="noopener noreferrer">Savol videosini ochish ↗</a>{/if}
  {:else}<p class="muted">Biriktirilgan media manzili mavjud emas.</p>{/if}
{/each}
