<!--
  EmptyState — what a list or page shows when there's nothing in it: an
  icon, one plain sentence of what goes here, and the next step.
  Props: icon, title, description, action (snippet), compact, class
-->
<script>
	import Icon from './Icon.svelte';
	import { cx } from './utils.js';

	/** @type {{ icon?: string, title: string, description?: string, compact?: boolean, action?: import('svelte').Snippet, class?: string }} */
	let {
		icon = 'overview',
		title,
		description = '',
		compact = false,
		action,
		class: klass = ''
	} = $props();
</script>

<div
	class={cx(
		'flex flex-col items-center rounded-card border border-dashed border-border-strong text-center',
		compact ? 'px-4 py-6' : 'px-6 py-12',
		klass
	)}
>
	<span
		class="flex size-12 items-center justify-center rounded-pill bg-accent-soft text-accent-text"
		><Icon name={icon} size={24} /></span
	>
	<p class="mt-4 text-base font-semibold text-fg">{title}</p>
	{#if description}<p class="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>{/if}
	{#if action}<div class="mt-5">{@render action()}</div>{/if}
</div>
