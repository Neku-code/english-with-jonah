<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = {
    id: string;
    label: string;
    value?: string;
    name?: string;
    placeholder?: string;
    help?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    autocomplete?: HTMLInputAttributes['autocomplete'];
    maxlength?: number;
  };
  let {
    id, label, value = $bindable(''), name, placeholder, help, error,
    disabled = false, required = false, autocomplete, maxlength
  }: Props = $props();
</script>

<div class="field">
  <label for={id}>{label}{#if required}<span aria-hidden="true"> *</span>{/if}</label>
  <input {id} name={name ?? id} type="text" bind:value {placeholder} {disabled}
    {required} {autocomplete} {maxlength} aria-invalid={error ? 'true' : undefined}
    aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined} />
  {#if error}<p class="field__error" id="{id}-error" role="alert">{error}</p>
  {:else if help}<p class="field__help" id="{id}-help">{help}</p>{/if}
</div>
