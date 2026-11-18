<!--
  Seo — a page's title, description, social preview (Open Graph, X) and
  structured data (schema.org JSON-LD) for search engines and AI assistants.
  The canonical link and noindex for private pages come from the root
  layout; site-wide constants and builders are in $lib/seo.js.

  <Seo title="…" description="…" image={src} type="article" jsonld={[…]} />
-->
<script>
	import { page } from '$app/stores';
	import { SITE, abs, describe, ldJson } from '$lib/seo.js';

	/**
	 * @type {{
	 *   title: string,
	 *   description?: string | null,
	 *   image?: string | null,
	 *   imageAlt?: string | null,
	 *   type?: string,
	 *   noindex?: boolean,
	 *   jsonld?: any[]
	 * }}
	 */
	let {
		title,
		description = null,
		image = null,
		imageAlt = null,
		type = 'website',
		noindex = false,
		jsonld = []
	} = $props();

	const origin = $derived($page.url.origin);
	const desc = $derived(describe(description || SITE.description));
	const img = $derived(abs(origin, image || SITE.image));
	// One JSON-LD block holding every item the page describes.
	const ld = $derived.by(() => {
		const items = jsonld.filter(Boolean);
		if (!items.length) return '';
		const json = ldJson({ '@context': 'https://schema.org', '@graph': items });
		return `<script type="application/ld+json">${json}</` + 'script>';
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={desc} />
	{#if noindex}<meta name="robots" content="noindex, follow" />{/if}
	<meta property="og:title" content={title} />
	<meta property="og:description" content={desc} />
	<meta property="og:type" content={type} />
	<meta property="og:image" content={img} />
	{#if imageAlt}<meta property="og:image:alt" content={imageAlt} />{/if}
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={desc} />
	<meta name="twitter:image" content={img} />
	{#if ld}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON built by ldJson, < > & escaped -->
		{@html ld}
	{/if}
</svelte:head>
