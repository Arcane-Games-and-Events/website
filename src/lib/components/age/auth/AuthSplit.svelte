<script>
	/**
	 * Editorial auth split — left brand panel + right form panel.
	 *
	 * Used by login + signup. The brand side carries a cover image (with
	 * a dark gradient), a vertical eyebrow label, a kicker, a serif
	 * headline, and a short bullet list. The form side is rendered via
	 * the `form` snippet so each page composes its own field set.
	 */

	/**
	 * @type {{
	 *   image?: string,
	 *   vlabel?: string,
	 *   kicker?: string,
	 *   headline?: import('svelte').Snippet,
	 *   bullets?: string[],
	 *   formContent?: import('svelte').Snippet
	 * }}
	 */
	let {
		image = '',
		vlabel = '',
		kicker = '',
		headline,
		bullets = [],
		formContent
	} = $props();

	// Generic placeholder used until the user supplies real imagery.
	const fallback = 'https://www.age.events/banner/articles-banner.webp';
</script>

<!--
	The outer wrapper carries the section-bottom rule full-width so it
	matches the homepage's section dividers. The inner grid is capped at
	the same content cap as the rest of the editorial design, so on wide
	monitors the auth split sits inside the page gutters instead of
	stretching edge to edge.
-->
<div class="border-ink border-b-[3px] border-double">
<div class="mx-auto w-full max-w-[min(94vw,1920px)]">
<div class="grid min-h-[760px] grid-cols-1 lg:grid-cols-2">
	<!-- brand panel -->
	<div
		class="border-line2 relative flex flex-col justify-end overflow-hidden border-r bg-cover bg-center px-14 py-[54px]"
		style="background-image: url('{image || fallback}');"
	>
		<!-- dark gradient over the cover -->
		<span
			class="pointer-events-none absolute inset-0"
			style="background: linear-gradient(0deg, rgba(10,9,6,0.94) 6%, rgba(10,9,6,0.6) 48%, rgba(10,9,6,0.25) 100%);"
			aria-hidden="true"
		></span>

		<!-- vertical eyebrow on the left edge -->
		{#if vlabel}
			<span
				class="absolute top-[30px] left-[18px] z-[1] text-[10px] font-extrabold tracking-[0.32em] text-white/55 uppercase"
				style="writing-mode: vertical-rl; transform: rotate(180deg);"
			>
				{vlabel}
			</span>
		{/if}

		<div class="relative z-[1] text-white">
			{#if kicker}
				<div class="mb-4 text-[10.5px] font-bold tracking-[0.2em] text-[#f4c66a] uppercase">
					{kicker}
				</div>
			{/if}

			{#if headline}
				<h2
					class="font-newsreader mb-[18px] max-w-[440px] text-[46px] leading-[1.02] font-semibold tracking-[-0.02em] text-white"
				>
					{@render headline()}
				</h2>
			{/if}

			{#if bullets.length}
				<ul class="m-0 max-w-[380px] list-none p-0">
					{#each bullets as item, i (i)}
						<li
							class="flex items-start gap-3 border-t border-white/15 py-[11px] text-[14.5px] font-semibold text-[#efeadc] first:border-t-0"
						>
							<span class="bg-prem mt-[7px] block h-[7px] w-[7px] flex-shrink-0"></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<!-- form panel -->
	<div class="bg-paper-bg flex flex-col justify-center px-14 py-[54px] lg:px-[84px]">
		{#if formContent}{@render formContent()}{/if}
	</div>
</div>
</div>
</div>
