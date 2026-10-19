<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { MouseEventHandler } from 'svelte/elements';

  type Props = {
    children: Snippet;
    href?: string;
    variant?: 'primary' | 'secondary' | 'quiet';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    onclick?: MouseEventHandler<HTMLButtonElement>;
  };
  let { children, href, variant = 'primary', type = 'button', disabled = false, onclick }: Props = $props();
</script>

{#if href}
  <a class="button button--{variant}" {href}>{@render children()}</a>
{:else}
  <button class="button button--{variant}" {type} {disabled} {onclick}>{@render children()}</button>
{/if}
