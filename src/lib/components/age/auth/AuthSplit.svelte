<script>
	/**
	 * Sign-in flow layout, in the site's ink-and-paper register: an ink
	 * brand panel (event photo held back in greyscale, a kicker, a serif
	 * headline, a short list of what you get) beside the paper form panel.
	 * Used by login, sign-up, forgot password and reset password.
	 */

	/**
	 * @type {{
	 *   image?: string,
	 *   kicker?: string,
	 *   headline?: import('svelte').Snippet,
	 *   bullets?: string[],
	 *   footnote?: string,
	 *   formContent?: import('svelte').Snippet
	 * }}
	 */
	let {
		image = '/banner/age-open-banner.webp',
		kicker = '',
		headline,
		bullets = [],
		footnote = '',
		formContent
	} = $props();
</script>

<div class="grid min-h-[calc(100vh-61px)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
	<!-- brand panel -->
	<section class="relative overflow-hidden bg-ink text-paper-bg">
		<img
			src={image}
			alt=""
			aria-hidden="true"
			class="absolute inset-0 h-full w-full object-cover opacity-30 grayscale"
		/>
		<div
			class="absolute inset-0"
			style="background: linear-gradient(0deg, rgba(23,21,15,0.97) 10%, rgba(23,21,15,0.82) 55%, rgba(23,21,15,0.6) 100%);"
			aria-hidden="true"
		></div>

		<div
			class="fp-rise relative flex h-full flex-col justify-end px-5 py-10 md:px-12 md:py-14 lg:ml-auto lg:max-w-[600px] lg:px-14 lg:py-16"
		>
			{#if kicker}
				<p class="text-[9.5px] font-extrabold tracking-[0.26em] text-warm-light uppercase">
					<span aria-hidden="true">◆</span>
					{kicker}
				</p>
			{/if}
			{#if headline}
				<h2
					class="mt-4 max-w-[460px] font-newsreader text-[36px] leading-[1.02] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[52px]"
				>
					{@render headline()}
				</h2>
			{/if}
			{#if bullets.length}
				<ul class="mt-8 hidden max-w-[420px] border-t border-paper-bg/15 md:block">
					{#each bullets as item, i (i)}
						<li
							class="flex items-start gap-3 border-b border-paper-bg/15 py-3 text-[14px] font-semibold text-paper-bg/85"
						>
							<span class="mt-[7px] h-[7px] w-[7px] shrink-0 bg-warm-light" aria-hidden="true"
							></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			{/if}
			{#if footnote}
				<p class="mt-6 hidden font-newsreader text-[15px] text-paper-bg/55 italic md:block">
					{footnote}
				</p>
			{/if}
		</div>
	</section>

	<!-- form panel -->
	<section class="flex items-center bg-paper-bg">
		<div class="w-full px-5 py-10 md:px-12 md:py-14 lg:max-w-[560px] lg:px-14 lg:py-16">
			{#if formContent}{@render formContent()}{/if}
		</div>
	</section>
</div>
