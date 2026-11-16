<!--
  Card — a raised surface for one group of content. Optional header (title,
  description, actions on the right) and footer (a row of buttons).
  Props: title, description, padding (none | sm | md default | lg),
         as (section default | div | article), actions, footer, class (layout only)
-->
<script>
	import { cx } from './utils.js';

	/** @type {{ title?: string, description?: string, padding?: 'none' | 'sm' | 'md' | 'lg', as?: 'section' | 'div' | 'article', actions?: import('svelte').Snippet, footer?: import('svelte').Snippet, class?: string, children?: import('svelte').Snippet }} */
	let {
		title = '',
		description = '',
		padding = 'md',
		as = 'section',
		actions,
		footer,
		class: klass = '',
		children
	} = $props();

	const PAD = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };
</script>

<svelte:element
	this={as}
	class={cx('rounded-card border border-border bg-surface shadow-raised', klass)}
>
	{#if title || actions}
		<header
			class={cx(
				'flex flex-wrap items-start justify-between gap-3 border-b border-border',
				padding === 'none' ? 'px-5 py-4' : PAD[padding]
			)}
		>
			<div class="min-w-0">
				{#if title}<h2 class="text-base font-semibold text-fg">{title}</h2>{/if}
				{#if description}<p class="mt-1 text-sm text-fg-muted">{description}</p>{/if}
			</div>
			{#if actions}<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>{/if}
		</header>
	{/if}
	{#if children}<div class={PAD[padding]}>{@render children()}</div>{/if}
	{#if footer}
		<footer
			class="flex flex-wrap items-center justify-end gap-2 rounded-b-card border-t border-border bg-surface-sunken px-5 py-3"
		>
			{@render footer()}
		</footer>
	{/if}
</svelte:element>
