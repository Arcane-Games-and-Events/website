<!--
  RadioGroup — pick exactly one, every choice visible. For more than five
  choices use a Select.
  Props: value (bindable), name, legend, options [{ value, label, description? }],
         inline (side by side), class (layout only)
-->
<script>
	import { cx, uid } from './utils.js';

	/** @type {{ value?: any, name?: string, legend: string, options: { value: any, label: string, description?: string }[], inline?: boolean, class?: string }} */
	let {
		value = $bindable(),
		name = uid('radio'),
		legend,
		options,
		inline = false,
		class: klass = ''
	} = $props();
</script>

<fieldset class={klass}>
	<legend class="text-sm font-medium text-fg">{legend}</legend>
	<div class={cx('mt-2 flex gap-3', inline ? 'flex-wrap gap-x-6' : 'flex-col')}>
		{#each options as o (o.value)}
			{@const id = `${name}-${o.value}`}
			<div class="flex items-start gap-3">
				<input
					{id}
					type="radio"
					{name}
					value={o.value}
					bind:group={value}
					class="mt-0.5 size-4 shrink-0 cursor-pointer border-border-strong bg-surface text-accent focus:ring-2 focus:ring-ring/30 focus:ring-offset-0"
				/>
				<label for={id} class="cursor-pointer text-sm">
					<span class="font-medium text-fg">{o.label}</span>
					{#if o.description}<span class="block text-fg-subtle">{o.description}</span>{/if}
				</label>
			</div>
		{/each}
	</div>
</fieldset>
