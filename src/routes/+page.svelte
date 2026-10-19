<script lang="ts">
  import Button from '#lib/components/Button.svelte';
  import Badge from '#lib/components/Badge.svelte';
</script>
<svelte:head><title>Box 1 setup — English with Jonah</title><meta name="robots" content="noindex" /></svelte:head>
<section class="page-section">
  <p class="eyebrow">BOX 1 · PROJECT SETUP</p>
  <h1>English with Jonah</h1>
  <p class="intro">Technical setup and shared component verification. Application screens will follow your supplied design.</p>
  <div class="notice">Setup preview only. Student accounts, lessons and teacher tools have not been built yet.</div>
  <h2>Setup status</h2>
  <dl class="setup-list">
    <div><dt>Application</dt><dd>SvelteKit + TypeScript <Badge tone="sage">Verified locally</Badge></dd></div>
    <div><dt>GitHub</dt><dd><a href="https://github.com/Neku-code/english-with-jonah">Neku-code/english-with-jonah</a><span>Repository identified; upload status is in the setup notes.</span></dd></div>
    <div><dt>Database</dt><dd>Neon PostgreSQL + Drizzle <Badge tone="honey">Connection pending</Badge><span>Connection code and initial migration are prepared.</span></dd></div>
    <div><dt>Hosting</dt><dd>Vercel <Badge tone="honey">Deployment pending</Badge><span>Adapter and GitHub build checks are configured.</span></dd></div>
    <div><dt>Release scope</dt><dd>v0.1 · Unit 1: To Be</dd></div>
    <div><dt>Application design</dt><dd><Badge>Awaiting your design</Badge></dd></div>
  </dl>
  <div class="actions"><Button href="/foundation">Open component checks</Button><a href="/api/health">View app health</a></div>
</section>
