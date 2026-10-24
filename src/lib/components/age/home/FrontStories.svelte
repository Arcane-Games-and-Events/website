<script>
	import FrontDept from './FrontDept.svelte';
	import FrontByline from './FrontByline.svelte';

	/**
	 * Story department (Articles, Video) — one plate-framed feature with
	 * a drop-cap dek, then three hairline columns. `dark` renders the
	 * department as an ink band (used for Video).
	 */
	/** @type {{ id: string, title: string, strap?: string, href: string, label?: string, dark?: boolean, data: { feature: any, cards: any[] } | null }} */
	let { id, title, strap = '', href, label = 'See all', dark = false, data } = $props();
	const F = $derived(data?.feature ?? null);
	const cards = $derived(data?.cards ?? []);
	const isVideo = $derived((s) => s?.kind === 'video');

	const rubric = $derived(dark ? 'text-warm' : 'text-warm');
	const dek = $derived(dark ? 'text-paper-bg/70' : 'text-soft');
	const divide = $derived(dark ? 'divide-paper-bg/15' : 'divide-line');
	const hair = $derived(dark ? 'border-paper-bg/15' : 'border-line');
</script>

{#if F}
	<section class={dark ? 'w-full bg-ink py-12 text-paper-bg md:py-16' : ''}>
		<div class="mx-auto w-full max-w-[1200px] px-5 md:px-8">
			<FrontDept {id} {title} {strap} {href} {label} {dark} />

			<a
				href={F.href}
				class="group mt-8 block md:mt-10 md:grid md:grid-cols-[1.25fr_1fr] md:items-center md:gap-12 lg:gap-16"
			>
				<div
					class="relative aspect-video overflow-hidden bg-panel {dark
						? 'fp-plate-light'
						: 'fp-plate'}"
				>
					<div
						class="absolute inset-0 bg-cover bg-center transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
						style="background-image: url('{F.image}');"
						role="img"
						aria-label={F.alt}
					></div>
					{#if isVideo(F)}
						<span
							class="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white/95 pl-1 text-[20px] text-ink md:h-16 md:w-16"
						>
							▶
						</span>
					{/if}
				</div>
				<div class="pt-7 md:pt-0">
					<div class="{rubric} text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
						{F.rubric}
					</div>
					<h3
						class="mt-3 font-newsreader text-[30px] leading-[1.04] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[clamp(32px,3.2vw,44px)]"
					>
						<span class="fp-ul">{F.title}</span>
					</h3>
					{#if F.dek}
						<p
							class="font-newsreader {dek} mt-4 text-[16px] leading-[1.5] italic first-letter:float-left first-letter:mt-[5px] first-letter:mr-2 first-letter:text-[48px] first-letter:leading-[0.7] first-letter:font-semibold first-letter:text-warm first-letter:not-italic md:text-[18px] md:first-letter:text-[56px]"
						>
							{F.dek}
						</p>
					{/if}
					<div class="mt-5">
						<FrontByline
							author={F.author}
							date={F.date}
							length={F.length}
							premium={F.premium}
							onDark={dark}
						/>
					</div>
					<span
						class="mt-6 inline-block border-b-2 border-warm pb-1 text-[10.5px] font-extrabold tracking-[0.16em] text-warm uppercase transition-[letter-spacing] group-hover:tracking-[0.22em]"
					>
						{isVideo(F) ? 'Watch' : 'Continue reading'} →
					</span>
				</div>
			</a>

			{#if cards.length}
				<div
					class="mt-10 grid grid-cols-1 gap-6 border-t pt-7 md:mt-12 md:grid-cols-3 md:gap-0 md:divide-x md:pt-9 {hair} {divide}"
				>
					{#each cards as s (s.href)}
						<a
							href={s.href}
							class="group grid grid-cols-[120px_1fr] gap-4 md:block md:px-7 md:first:pl-0 md:last:pr-0"
						>
							<div class="relative aspect-video overflow-hidden bg-panel">
								<div
									class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.05]"
									style="background-image: url('{s.image}');"
									role="img"
									aria-label={s.alt}
								></div>
								{#if isVideo(s)}
									<span
										class="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white/95 pl-[2px] text-[11px] text-ink md:h-11 md:w-11 md:text-[14px]"
									>
										▶
									</span>
								{/if}
							</div>
							<div class="min-w-0 md:pt-5">
								<div class="{rubric} text-[9.5px] font-extrabold tracking-[0.18em] uppercase">
									{s.rubric}
								</div>
								<h4
									class="mt-2 font-newsreader text-[18px] leading-[1.15] font-semibold md:text-[22px]"
								>
									<span class="fp-ul">{s.title}</span>
								</h4>
								{#if s.dek}
									<p
										class="font-newsreader {dek} mt-2 line-clamp-2 hidden text-[15px] leading-[1.45] italic md:block"
									>
										{s.dek}
									</p>
								{/if}
								<div class="mt-2.5 md:mt-3">
									<FrontByline
										author={s.author}
										length={s.length}
										premium={s.premium}
										size="sm"
										onDark={dark}
									/>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</section>
{/if}
