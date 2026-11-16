<!--
  SegmentedControl — two to five views of the same thing (Day / Week /
  Month, List / Board). Not for navigation between pages — use Tabs.
  Props: value (bindable), options [{ value, label, icon? }], label (accessible
         name), size (sm | md), class (layout only)
-->
<script>
	import Icon from './Icon.svelte';
	import { cx, focusRing } from './utils.js';

	/** @type {{ value?: any, options: { value: any, label: string, icon?: string }[], label: string, size?: 'sm' | 'md', class?: string }} */
	let { value = $bindable(), options, label, size = 'md', class: klass = '' } = $props();
</script>

<div
	class={cx('inline-flex gap-1 rounded-control bg-surface-sunken p-1', klass)}
	role="radiogroup"
	aria-label={label}
>
	{#each options as o (o.value)}
		{@const on = value === o.value}
		<button
			type="button"
			role="radio"
			aria-checked={on}
			onclick={() => (value = o.value)}
			class={cx(
				'inline-flex items-center gap-1.5 rounded-control px-3 font-medium transition-colors duration-150 ease-out',
				focusRing,
				size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm',
				on ? 'bg-surface text-fg shadow-raised' : 'text-fg-muted hover:text-fg'
			)}
		>
			{#if o.icon}<Icon name={o.icon} size={16} />{/if}{o.label}
		</button>
	{/each}
</div>
