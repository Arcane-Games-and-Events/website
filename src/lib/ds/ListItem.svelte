<!--
  ListItem — one row in a List: something on the left (an Avatar, an icon
  tile, a picture), a title with a line of detail and badges, something on
  the right (an amount, a date), and an action menu. The row opens the
  item when given `href`; actions stay out of the row (use `actions`).

  Props: href, title, description, meta (right text), metaSub,
         leading (snippet), badges (snippet), actions (snippet), unread
-->
<script>
	import Icon from './Icon.svelte';
	import { cx, focusRing } from './utils.js';

	/** @type {{ href?: string, title: string, description?: string, meta?: string, metaSub?: string, unread?: boolean, leading?: import('svelte').Snippet, badges?: import('svelte').Snippet, actions?: import('svelte').Snippet }} */
	let {
		href,
		title,
		description = '',
		meta = '',
		metaSub = '',
		unread = false,
		leading,
		badges,
		actions
	} = $props();
</script>

<li class="flex items-center gap-2 pr-2 sm:pr-3">
	<svelte:element
		this={href ? 'a' : 'div'}
		{href}
		class={cx(
			'group flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 sm:gap-4 sm:pl-5',
			href && 'transition-colors duration-150 ease-out hover:bg-surface-sunken',
			href && focusRing
		)}
	>
		{#if leading}<span class="shrink-0">{@render leading()}</span>{/if}
		<span class="min-w-0 flex-1">
			<span class="flex items-center gap-2">
				{#if unread}<span class="size-2 shrink-0 rounded-pill bg-accent" aria-label="New"
					></span>{/if}
				<span class={cx('truncate text-sm text-fg', unread ? 'font-semibold' : 'font-medium')}
					>{title}</span
				>
			</span>
			{#if description}<span class="mt-0.5 block truncate text-sm text-fg-subtle"
					>{description}</span
				>{/if}
			{#if badges}<span class="mt-1.5 flex flex-wrap gap-1.5">{@render badges()}</span>{/if}
		</span>
		{#if meta || metaSub}
			<span class="shrink-0 text-right">
				{#if meta}<span class="block text-sm font-medium text-fg tabular-nums">{meta}</span>{/if}
				{#if metaSub}<span class="block text-xs text-fg-subtle tabular-nums">{metaSub}</span>{/if}
			</span>
		{/if}
		{#if href}<span class="shrink-0 text-fg-subtle transition-colors group-hover:text-fg"
				><Icon name="chevron" size={16} /></span
			>{/if}
	</svelte:element>
	{#if actions}<div class="shrink-0">{@render actions()}</div>{/if}
</li>
