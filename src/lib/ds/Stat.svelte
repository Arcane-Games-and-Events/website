<!--
  Stat — one key number: a label, the figure, and a note or a change.
  Props:
    label, value, note
    change   { value: '+12%', direction: 'up' | 'down', good?: boolean } —
             good defaults to up; colours it green or red accordingly
    icon     an icon on a tinted tile
    tone     the tile's colour: accent (default) | success | warning | danger | info | brand
    color    for tone="brand": a CSS colour from the data
    href     makes the whole card a link
-->
<script>
	import Icon from './Icon.svelte';
	import { cx, focusRing } from './utils.js';

	/** @type {{ label: string, value: string | number, note?: string, change?: { value: string, direction: 'up' | 'down', good?: boolean } | null, icon?: string, tone?: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'brand', color?: string, href?: string, class?: string }} */
	let {
		label,
		value,
		note = '',
		change = null,
		icon = '',
		tone = 'accent',
		color = '',
		href,
		class: klass = ''
	} = $props();

	const TILE = {
		accent: 'bg-accent-soft text-accent-text',
		success: 'bg-success-soft text-success-text',
		warning: 'bg-warning-soft text-warning-text',
		danger: 'bg-danger-soft text-danger-text',
		info: 'bg-info-soft text-info-text',
		brand: 'bg-(--tone)/15 text-(--tone)'
	};
	const good = $derived(change ? (change.good ?? change.direction === 'up') : true);
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class={cx(
		'block rounded-card border border-border bg-surface p-4 shadow-raised sm:p-5',
		href && 'transition-colors duration-150 ease-out hover:border-border-strong',
		href && focusRing,
		klass
	)}
	style={tone === 'brand' && color ? `--tone: ${color}` : undefined}
>
	<div class="flex items-start justify-between gap-3">
		<p class="text-sm font-medium text-fg-muted">{label}</p>
		{#if icon}
			<span class="flex size-8 shrink-0 items-center justify-center rounded-control {TILE[tone]}"
				><Icon name={icon} size={16} /></span
			>
		{/if}
	</div>
	<p class="mt-2 text-3xl font-semibold tracking-tight text-fg tabular-nums">{value}</p>
	{#if change || note}
		<p class="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-fg-subtle">
			{#if change}
				<span class={cx('font-medium', good ? 'text-success-text' : 'text-danger-text')}
					>{change.direction === 'up' ? '↑' : '↓'} {change.value}</span
				>
			{/if}
			{#if note}<span>{note}</span>{/if}
		</p>
	{/if}
</svelte:element>
