<script>
	/**
	 * The one Premium marker for the whole site: a solid green block with a
	 * ◆ and "Premium" in small caps, so members-only work is identifiable at
	 * a glance on any card, cover or byline. Free work carries no tag.
	 *
	 *   inline (default) — sits in a byline or meta row
	 *   corner           — pinned to the top-left of a cover image
	 *                      (the parent must be `relative`)
	 */
	/** @type {{ variant?: 'inline' | 'corner', size?: 'sm' | 'md' | 'lg' }} */
	let { variant = 'inline', size = 'md' } = $props();
	const sizes = {
		sm: 'gap-1.5 px-2.5 py-[6px] text-[10px] tracking-[0.14em]',
		md: 'gap-1.5 px-3 py-[7px] text-[11px] tracking-[0.15em]',
		lg: 'gap-2 px-3.5 py-2 text-[12px] tracking-[0.17em]'
	};
</script>

<span
	class="inline-flex shrink-0 items-center bg-prem leading-none font-extrabold whitespace-nowrap text-white uppercase {sizes[
		size
	]} {variant === 'corner'
		? 'absolute top-0 left-0 z-[2] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.5)]'
		: ''}"
>
	<span class="text-[0.8em] leading-none opacity-90" aria-hidden="true">◆</span>Premium
</span>
