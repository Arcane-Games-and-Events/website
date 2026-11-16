<!--
  Field — a label, the control, and a hint or an error under it. Wires the
  label and the messages to the control: the child snippet gets the id and
  the describedby id to put on it.

    <Field label="Store name" hint="As players will see it" error={errors.name}>
      {#snippet children({ id, describedby, invalid })}
        <Input {id} aria-describedby={describedby} {invalid} bind:value={name} />
      {/snippet}
    </Field>

  Props: label, hint, error, required, optional (shows "Optional"), id, class
-->
<script>
	import { uid } from './utils.js';

	/** @type {{ label: string, hint?: string, error?: string | null, required?: boolean, optional?: boolean, id?: string, class?: string, children: import('svelte').Snippet<[{ id: string, describedby: string | undefined, invalid: boolean }]> }} */
	let {
		label,
		hint = '',
		error = null,
		required = false,
		optional = false,
		id = uid('field'),
		class: klass = '',
		children
	} = $props();

	const msgId = $derived(`${id}-msg`);
</script>

<div class="flex flex-col gap-1.5 {klass}">
	<label for={id} class="flex items-baseline justify-between gap-3 text-sm font-medium text-fg">
		<span
			>{label}{#if required}<span class="ml-0.5 text-danger-text" aria-hidden="true">*</span
				>{/if}</span
		>
		{#if optional}<span class="text-xs font-normal text-fg-subtle">Optional</span>{/if}
	</label>
	{@render children({ id, describedby: error || hint ? msgId : undefined, invalid: !!error })}
	{#if error}
		<p id={msgId} class="text-sm text-danger-text">{error}</p>
	{:else if hint}
		<p id={msgId} class="text-sm text-fg-subtle">{hint}</p>
	{/if}
</div>
