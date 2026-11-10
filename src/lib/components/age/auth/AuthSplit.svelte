<script>
	/**
	 * Sign-in flow layout, in the site's ink-and-paper register: an ink
	 * brand panel (event photo held back in greyscale, a kicker, a serif
	 * headline, a short list of what you get) beside the paper form panel.
	 * On wide screens the pair fills the screen under the header exactly,
	 * both panels centred, so nothing sits below the fold. On phones the
	 * form comes first, so its fields and button are on screen without
	 * scrolling, and the brand panel follows it.
	 * Used by login, sign-up, forgot password and reset password.
	 *
	 * tabs ({ current: 'login' | 'signup', loginHref, signupHref }) adds the
	 * Sign in / Create account switch above the form.
	 */

	/**
	 * @type {{
	 *   image?: string,
	 *   kicker?: string,
	 *   headline?: import('svelte').Snippet,
	 *   bullets?: (string | { dept: string, text: string })[],
	 *   footnote?: string,
	 *   tabs?: { current: 'login' | 'signup', loginHref: string, signupHref: string },
	 *   formContent?: import('svelte').Snippet
	 * }}
	 */
	let {
		image = '/banner/age-open-banner.webp',
		kicker = '',
		headline,
		bullets = [],
		footnote = '',
		tabs,
		formContent
	} = $props();
</script>

<div
	class="grid grid-cols-1 lg:min-h-[calc(100svh-71px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
>
	<!-- brand panel: beside the form on wide screens, after it on phones -->
	<section class="relative order-2 overflow-hidden bg-ink text-paper-bg lg:order-1">
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
			class="fp-rise relative flex h-full flex-col justify-center px-5 py-9 md:px-12 md:py-12 lg:ml-auto lg:max-w-[600px] lg:px-14 lg:py-10"
		>
			{#if kicker}
				<p class="text-[9.5px] font-extrabold tracking-[0.26em] text-warm-light uppercase">
					<span aria-hidden="true">◆</span>
					{kicker}
				</p>
			{/if}
			{#if headline}
				<h2
					class="mt-3 max-w-[460px] font-newsreader text-[30px] leading-[1.04] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[40px] xl:text-[46px]"
				>
					{@render headline()}
				</h2>
			{/if}
			{#if bullets.length}
				<!-- what's inside, like a magazine's contents: a department and a line -->
				<ul class="mt-6 max-w-[440px] border-t-[3px] border-double border-paper-bg/25">
					{#each bullets as item, i (i)}
						<li class="border-b border-paper-bg/15 py-2.5">
							{#if typeof item === 'string'}
								<span class="flex items-start gap-3 text-[14px] font-semibold text-paper-bg/85">
									<span class="mt-[7px] h-[7px] w-[7px] shrink-0 bg-warm-light" aria-hidden="true"
									></span>
									<span>{item}</span>
								</span>
							{:else}
								<span
									class="block text-[9.5px] font-extrabold tracking-[0.22em] text-warm-light uppercase"
									>{item.dept}</span
								>
								<span
									class="mt-0.5 block font-newsreader text-[15.5px] leading-snug text-paper-bg/85"
									>{item.text}</span
								>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			{#if footnote}
				<p class="mt-5 font-newsreader text-[15px] text-paper-bg/55 italic">
					{footnote}
				</p>
			{/if}
		</div>
	</section>

	<!-- form panel: first on phones -->
	<section class="order-1 flex items-start bg-paper-bg lg:order-2 lg:items-center">
		<div class="w-full px-5 pt-4 pb-8 md:px-12 md:py-10 lg:max-w-[560px] lg:px-14 lg:py-8">
			{#if tabs}
				<nav
					class="mb-4 grid grid-cols-2 border border-line2 md:mb-7"
					aria-label="Sign in or create an account"
				>
					{#each [['login', 'Sign in', tabs.loginHref], ['signup', 'Create account', tabs.signupHref]] as [key, label, href] (key)}
						<a
							{href}
							aria-current={tabs.current === key ? 'page' : undefined}
							class="flex min-h-[42px] items-center justify-center text-[10px] font-extrabold tracking-[0.18em] uppercase transition-colors {tabs.current ===
							key
								? 'bg-ink text-paper-bg'
								: 'text-soft hover:bg-paper hover:text-ink'}">{label}</a
						>
					{/each}
				</nav>
			{/if}
			{#if formContent}{@render formContent()}{/if}
		</div>
	</section>
</div>
