<script>
	/**
	 * Small-caps byline: BY AUTHOR · date · length · Premium. Separators
	 * are their own flex items so spacing is even regardless of which
	 * parts are present.
	 */
	/** @type {{ author?: string, date?: string, length?: string, premium?: boolean, size?: 'sm' | 'md', onDark?: boolean }} */
	let {
		author = '',
		date = '',
		length = '',
		premium = false,
		size = 'md',
		onDark = false
	} = $props();
	const tail = $derived([date, length].filter(Boolean).join(' · '));
</script>

<div
	class="flex flex-wrap items-baseline gap-x-2 {size === 'sm'
		? 'text-[10px]'
		: 'text-[11px]'} {onDark ? 'text-white/60' : 'text-fade'}"
>
	{#if author}
		<span
			class="font-extrabold tracking-[0.12em] uppercase {onDark ? 'text-white/90' : 'text-ink'}"
		>
			By {author}
		</span>
	{/if}
	{#if author && tail}<span aria-hidden="true">·</span>{/if}
	{#if tail}<span class="font-semibold">{tail}</span>{/if}
	{#if premium}
		{#if author || tail}<span aria-hidden="true">·</span>{/if}
		<span class="font-extrabold tracking-[0.12em] text-prem uppercase">Premium</span>
	{/if}
</div>
