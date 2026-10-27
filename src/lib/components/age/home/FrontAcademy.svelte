<script>
	/**
	 * Academy department — its own sub-brand inside the magazine: a deep
	 * board-green band, gold accents, and the
	 * courses as paper cards. The featured course runs as one wide card
	 * (cover beside the syllabus copy), the rest as a row of cards. Each
	 * card carries a "lesson track" — one gold tick per lesson — so the
	 * size of a course reads at a glance. Hover lifts a card onto a gold
	 * plate. Same vocabulary as the rest of the site (small caps,
	 * Newsreader, hairlines, no rounded corners), different room.
	 */
	/** @type {{ data: { featured: any, list: any[], live: boolean } }} */
	import CourseCard from '$lib/components/age/academy/CourseCard.svelte';
	import CourseCover from '$lib/components/age/academy/CourseCover.svelte';

	let { data } = $props();
	const F = $derived(data?.featured ?? null);
	const list = $derived(data?.list ?? []);
	const meta = $derived((c) =>
		[c?.lessons ? `${c.lessons} lessons` : '', c?.runtime].filter(Boolean).join(' · ')
	);
	const ticks = (c) => Array.from({ length: Math.min(Math.max(c?.lessons || 0, 0), 24) });
	const priceLabel = (c) => (c?.price > 0 ? `$${c.price}` : 'Free');
	const cta = (c) => (c?.price > 0 ? 'Enroll' : 'Start free');
	const VALUES = [
		'Buy once, keep for life',
		'Premium members get every course update free',
		'Taught by the players who define the format'
	];
</script>

{#snippet track(c, tone)}
	<!-- lesson track: one tick per lesson -->
	{#if c?.lessons}
		<span class="flex items-end gap-[3px]" aria-hidden="true">
			{#each ticks(c) as _, i (i)}
				<span class="block h-[7px] w-[3px] {tone} transition-colors"></span>
			{/each}
		</span>
	{/if}
{/snippet}

{#if F}
	<section
		id="academy"
		class="relative w-full scroll-mt-6 overflow-hidden bg-academy py-14 text-paper-bg md:py-20"
	>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 h-40"
			style="background: linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0));"
			aria-hidden="true"
		></div>

		<div class="relative mx-auto w-full max-w-[1200px] px-5 md:px-8">
			<!-- masthead -->
			<div class="flex items-center gap-4 md:gap-6">
				<span class="h-px flex-1 bg-gold/50"></span>
				<div
					class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.3em] text-gold uppercase md:text-[11.5px]"
				>
					<span aria-hidden="true">◆</span>
					AGE Academy
					<span aria-hidden="true">◆</span>
				</div>
				<span class="h-px flex-1 bg-gold/50"></span>
			</div>
			<div class="mx-auto mt-5 max-w-[760px] text-center md:mt-6">
				<h2
					class="font-newsreader text-[32px] leading-[1.02] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[48px]"
				>
					Learn the game from the players who define it.
				</h2>
				<p
					class="mt-3 font-newsreader text-[16px] leading-[1.45] text-paper-bg/70 italic md:mt-4 md:text-[19px]"
				>
					Full courses on decision-making, sideboarding, and tempo — written by the pros, broken
					into short lessons, yours for life.
				</p>
				<a
					href="/academy"
					class="mt-5 inline-flex items-center gap-2 border-b border-gold pb-1 text-[10.5px] font-extrabold tracking-[0.2em] text-paper-bg uppercase transition-[letter-spacing] hover:tracking-[0.28em] md:mt-6"
				>
					Browse all courses →
				</a>
			</div>

			<!-- featured course: one wide card -->
			<a href={F.href} class="group relative mt-10 block md:mt-14">
				<span
					class="absolute inset-0 translate-x-1.5 translate-y-1.5 border border-gold/50 opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:opacity-100"
					aria-hidden="true"
				></span>
				<span
					class="relative z-[1] block bg-paper-bg text-ink transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:-translate-x-px group-hover:-translate-y-px lg:grid lg:grid-cols-[1.15fr_1fr]"
				>
					<CourseCover image={F.image} slug={F.slug || F.href}>
						<span
							class="absolute top-0 left-0 bg-gold px-3 py-1.5 text-[9.5px] font-extrabold tracking-[0.18em] text-[#241b07] uppercase"
						>
							Featured course
						</span>
					</CourseCover>
					<span class="flex flex-col p-6 md:p-8 lg:p-10">
						<span class="text-[10.5px] font-extrabold tracking-[0.18em] text-gold uppercase">
							With {F.instructor}
						</span>
						<span
							class="mt-3 block font-newsreader text-[26px] leading-[1.06] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[34px]"
						>
							<span class="fp-ul">{F.title}</span>
						</span>
						{#if F.dek}
							<span
								class="mt-4 block font-newsreader text-[16px] leading-[1.5] text-soft italic md:text-[17px]"
							>
								{F.dek}
							</span>
						{/if}
						<span class="mt-auto block pt-6">
							<span class="flex items-center gap-3 text-[10.5px] font-semibold text-fade">
								{@render track(F, 'bg-gold')}
								{#if meta(F)}<span>{meta(F)}</span>{/if}
							</span>
							<span class="mt-5 flex items-center justify-between gap-4 border-t border-line pt-5">
								<span class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
									<span class="font-newsreader text-[26px] leading-none font-semibold tabular-nums"
										>{priceLabel(F)}</span
									>
									{#if F.price > 0}<span
											class="text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap text-fade uppercase sm:text-[11px]"
											>Lifetime access</span
										>{/if}
								</span>
								<span
									class="inline-flex shrink-0 items-center bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap text-paper-bg uppercase transition-colors duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:bg-gold group-hover:text-[#241b07]"
								>
									{cta(F)} →
								</span>
							</span>
						</span>
					</span>
				</span>
			</a>

			<!-- the catalogue: a row of cards -->
			{#if list.length}
				<ul class="mt-6 grid gap-6 md:mt-8 md:grid-cols-3 md:gap-5 lg:gap-6">
					{#each list as c (c.href + c.title)}
						<li><CourseCard course={c} /></li>
					{/each}
				</ul>
			{/if}

			<!-- house rules -->
			<ul
				class="mt-10 flex flex-col gap-3 border-t border-paper-bg/15 pt-6 text-[10px] font-extrabold tracking-[0.16em] text-paper-bg/70 uppercase md:mt-12 md:flex-row md:justify-center md:gap-10 md:text-[10.5px]"
			>
				{#each VALUES as v (v)}
					<li class="flex items-center gap-2.5">
						<span class="text-[8px] text-gold" aria-hidden="true">◆</span>
						{v}
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}
