<script lang="ts">
  import Button from '#lib/components/Button.svelte';
  import TextInput from '#lib/components/TextInput.svelte';
  import Badge from '#lib/components/Badge.svelte';
  import Progress from '#lib/components/Progress.svelte';
  const palette = [{name:'Background',hex:'#F6F0E6'},{name:'Primary',hex:'#B9603C'},{name:'Secondary',hex:'#8BA383'},{name:'Accent',hex:'#E2A845'},{name:'Text',hex:'#2F2A25'}];
  let sampleName = $state('');
  let status = $state('Ready to try. Nothing is saved.');
  let error = $state('');
  function preview(event: SubmitEvent) {
    event.preventDefault();
    error = sampleName.trim() ? '' : 'Please enter a name to try the preview.';
    status = error ? 'Please check the name field.' : 'Form check passed. Nothing has been saved.';
  }
</script>
<svelte:head><title>Component checks — English with Jonah</title><meta name="robots" content="noindex" /></svelte:head>
<section class="page-section">
  <p class="eyebrow">BOX 1 · SHARED FOUNDATION</p><h1>Component checks</h1>
  <p class="intro">Plain specimens to verify colours, typography, controls and phone/PC reflow. This is not an application screen design.</p>
  <section class="check-section" aria-labelledby="palette-title"><h2 id="palette-title">Confirmed Clay & Sage palette</h2><div class="palette-grid">{#each palette as colour}<div class="swatch"><div class="swatch__colour" style:background={colour.hex}></div><h3>{colour.name}</h3><code>{colour.hex}</code></div>{/each}</div></section>
  <section class="check-section" aria-labelledby="type-title"><h2 id="type-title">Typography</h2><p>DM Sans is the provisional reading font, served locally. Final typography can follow your design.</p><div class="sample-panel"><h3>Sample heading</h3><p>Simple instructions should be easy to read on a phone and a PC.</p><p>Aa Bb Cc · 0123456789 · English → Uzbek</p></div></section>
  <section class="check-section" aria-labelledby="controls-title"><h2 id="controls-title">Buttons and inputs</h2><div class="responsive-grid"><div class="sample-panel"><h3>Button states</h3><div class="button-samples"><Button onclick={() => { status = 'Button check passed.'; }}>Primary action</Button><Button variant="secondary" onclick={() => { status = 'Ready to try. Nothing is saved.'; }}>Reset message</Button><Button variant="quiet" href="/">Back to setup</Button><Button disabled>Not available yet</Button></div></div><form class="sample-panel" onsubmit={preview} novalidate><h3>Input and validation</h3><TextInput id="preview-name" label="Your name" bind:value={sampleName} placeholder="For example, Aziz" help="Component check only. This does not create an account." {error} autocomplete="off" maxlength={80} /><Button type="submit" variant="secondary">Try the form</Button><TextInput id="disabled-example" label="Disabled input" value="Not available yet" disabled /></form></div><p class="notice" role="status">{status}</p></section>
  <section class="check-section" aria-labelledby="feedback-title"><h2 id="feedback-title">Status and progress specimens</h2><div class="responsive-grid"><div class="sample-panel"><h3>Status labels</h3><div class="badge-samples"><Badge>Not started</Badge><Badge tone="sage">Finished</Badge><Badge tone="honey">Not mastered yet</Badge><Badge tone="clay">Try again</Badge></div></div><div class="sample-panel"><h3>Example: 25 / 100 points</h3><Progress value={25} label="Example unit points: 25 out of 100" /><p>Illustrative only: 3 of 6 lessons finished. No exam points yet.</p></div></div><p>Use Tab to check focus indicators. On a phone, these columns stack and inputs keep a readable 16px text size.</p></section>
</section>
