<script>
	/**
	 * Tinted course cover — the photo rendered as a duotone in the
	 * course's own colour (stable per slug), so every thumbnail in the
	 * Academy reads as a distinct plate rather than a stock photo. When
	 * the enclosing `group` is hovered the tint lifts and the real
	 * picture shows through. Children render on top (tags, labels).
	 */
	import { coverTint } from '$lib/academy/format.js';

	/** @type {{ image: string, slug: string, alt?: string, class?: string, children?: import('svelte').Snippet }} */
	let { image, slug, alt = '', class: klass = '', children } = $props();
	const tint = $derived(coverTint(slug));
</script>

<span
	class="relative block aspect-video overflow-hidden {klass}"
	style="background-color: {tint.base};"
>
	<img
		class="absolute inset-0 h-full w-full object-cover contrast-[1.08] grayscale transition duration-1400 ease-out group-hover:scale-102 group-hover:grayscale-[0.35]"
		src={image}
		{alt}
		loading="lazy"
	/>
	<span
		class="absolute inset-0 opacity-90 transition-opacity duration-1400 ease-out group-hover:opacity-50"
		style="background-color: {tint.base}; mix-blend-mode: multiply;"
		aria-hidden="true"
	></span>
	<span
		class="absolute inset-0 opacity-50 transition-opacity duration-1400 ease-out group-hover:opacity-25"
		style="background: linear-gradient(135deg, {tint.light} 0%, transparent 65%); mix-blend-mode: screen;"
		aria-hidden="true"
	></span>
	{#if children}{@render children()}{/if}
</span>
