<script>
	/**
	 * One responsive image from the image library.
	 *
	 * Takes the `{ src, srcset, avifSrcset, width, height, alt, blur }` shape
	 * from `mediaImage()` and lets the browser pick: AVIF where it's supported,
	 * WebP otherwise, at the width `sizes` says it will be drawn. The tiny
	 * blurred preview sits behind the image until it has loaded, then goes, so
	 * transparent images don't keep a blur behind them.
	 *
	 * The `<picture>` is `display: contents`, so `class` styles the `<img>`
	 * exactly as a bare `<img>` would be styled (absolute fills, object-cover…).
	 * Images uploaded before the library have only `src` and render as plain
	 * images.
	 */
	import { onMount } from 'svelte';

	/** @type {{ image: any, sizes?: string, alt?: string, class?: string, style?: string, loading?: 'lazy' | 'eager', fetchpriority?: 'high' | 'low' | 'auto', ariaHidden?: boolean }} */
	let {
		image,
		sizes = '100vw',
		alt = undefined,
		class: klass = '',
		style = '',
		loading = 'lazy',
		fetchpriority = undefined,
		ariaHidden = false
	} = $props();

	let loaded = $state(false);
	/** @type {HTMLImageElement | undefined} */
	let img = $state();

	// An image can finish loading before the page's script runs.
	onMount(() => {
		if (img?.complete && img.naturalWidth) loaded = true;
	});

	const placeholder = $derived(
		image?.blur && !loaded
			? `background-image: url("${image.blur}"); background-size: cover; background-position: center;`
			: ''
	);
</script>

{#if image?.src}
	<picture class="contents">
		{#if image.avifSrcset}
			<source type="image/avif" srcset={image.avifSrcset} {sizes} />
		{/if}
		{#if image.srcset}
			<source type="image/webp" srcset={image.srcset} {sizes} />
		{/if}
		<img
			bind:this={img}
			src={image.src}
			alt={alt ?? image.alt ?? ''}
			width={image.width || undefined}
			height={image.height || undefined}
			{loading}
			{fetchpriority}
			decoding="async"
			aria-hidden={ariaHidden ? 'true' : undefined}
			class={klass}
			style="{placeholder}{style}"
			onload={() => (loaded = true)}
		/>
	</picture>
{/if}
