<script>
	/**
	 * Small-caps byline: BY AUTHOR · date · length · Premium. Separators
	 * are their own flex items so spacing is even regardless of which
	 * parts are present. With `stack`, phones get a deliberate two-line
	 * layout — the author on one line, date · length · Premium on the
	 * next — instead of wrapping wherever the author's name happens to
	 * run out of room; from md up it is the usual single line.
	 */
	/** @type {{ author?: string, date?: string, length?: string, premium?: boolean, size?: 'sm' | 'md', onDark?: boolean, stack?: boolean }} */
	let {
		author = '',
		date = '',
		length = '',
		premium = false,
		size = 'md',
		onDark = false,
		stack = false
	} = $props();
	const tail = $derived([date, length].filter(Boolean).join(' · '));
</script>

<div
	class="{stack
		? 'flex flex-col items-center gap-y-1 md:flex-row md:flex-wrap md:items-baseline md:justify-center md:gap-x-2 md:gap-y-0'
		: 'flex flex-wrap items-baseline gap-x-2'} {size === 'sm'
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
	{#if author && (tail || premium)}
		<span class={stack ? 'hidden md:inline' : ''} aria-hidden="true">·</span>
	{/if}
	{#if tail || premium}
		<span class="flex items-baseline gap-x-2 whitespace-nowrap">
			{#if tail}<span class="font-semibold">{tail}</span>{/if}
			{#if premium}
				{#if tail}<span aria-hidden="true">·</span>{/if}
				<span class="font-extrabold tracking-[0.12em] text-prem uppercase">Premium</span>
			{/if}
		</span>
	{/if}
</div>
