<!--
  Checkbox — on/off for a choice among others, with its label (and an
  optional line of description) to the right. The whole row is clickable.
  Props: checked (bindable), label, description, class (layout only)
-->
<script>
	import { uid } from './utils.js';

	/** @type {{ checked?: boolean, label: string, description?: string, id?: string, class?: string, [key: string]: any }} */
	let {
		checked = $bindable(false),
		label,
		description = '',
		id = uid('check'),
		class: klass = '',
		...rest
	} = $props();
</script>

<div class="flex items-start gap-3 {klass}">
	<input
		{...rest}
		{id}
		type="checkbox"
		bind:checked
		aria-describedby={description ? `${id}-d` : undefined}
		class="mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border-border-strong bg-surface text-accent focus:ring-2 focus:ring-ring/30 focus:ring-offset-0"
	/>
	<label for={id} class="cursor-pointer text-sm">
		<span class="font-medium text-fg">{label}</span>
		{#if description}<span id="{id}-d" class="block text-fg-subtle">{description}</span>{/if}
	</label>
</div>
