<!--
  Switch — a setting that takes effect at once (or on save), on or off.
  Use a Checkbox for a choice in a list; a Switch for "this is on".
  Props: checked (bindable), label, description, name (submits "on" when
         checked, inside a form), class (layout only)
-->
<script>
	import { cx, focusRing, uid } from './utils.js';

	/** @type {{ checked?: boolean, label: string, description?: string, name?: string, disabled?: boolean, id?: string, class?: string }} */
	let {
		checked = $bindable(false),
		label,
		description = '',
		name = '',
		disabled = false,
		id = uid('switch'),
		class: klass = ''
	} = $props();
</script>

<div class="flex items-start justify-between gap-4 {klass}">
	<span class="text-sm">
		<label for={id} id="{id}-l" class="font-medium text-fg">{label}</label>
		{#if description}<span id="{id}-d" class="block text-fg-subtle">{description}</span>{/if}
	</span>
	<button
		{id}
		type="button"
		role="switch"
		aria-checked={checked}
		aria-labelledby="{id}-l"
		aria-describedby={description ? `${id}-d` : undefined}
		{disabled}
		onclick={() => (checked = !checked)}
		class={cx(
			'relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill p-0.5 transition-colors duration-150 ease-out disabled:opacity-50',
			focusRing,
			checked ? 'bg-accent' : 'bg-border-strong'
		)}
	>
		<span
			class={cx(
				'size-5 rounded-pill bg-surface shadow-raised transition-transform duration-200 ease-out motion-reduce:transition-none',
				checked ? 'translate-x-5' : 'translate-x-0'
			)}
		></span>
	</button>
	{#if name && checked}<input type="hidden" {name} value="on" />{/if}
</div>
