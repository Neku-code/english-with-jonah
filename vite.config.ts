import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// Each HTTP suite runs a separate dev server/database. Runtime env modules
// are generated files, so sharing their output can cross-wire those databases.
const testNamespace = process.env.JONAH_TEST_NAMESPACE;
if (testNamespace && !/^[a-z0-9-]+$/.test(testNamespace)) throw new Error('Invalid HTTP test namespace');
const testRoot = testNamespace ? `.artifacts/http-apps/${testNamespace}` : undefined;

export default defineConfig({
  ...(testRoot ? { cacheDir: `${testRoot}/vite` } : {}),
  plugins: [sveltekit({ adapter: adapter(), preprocess: vitePreprocess(), ...(testRoot ? { outDir: `${testRoot}/svelte-kit` } : {}) })]
});
