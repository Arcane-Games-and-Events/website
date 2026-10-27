<script>
	import LibraryWordmark from '../library/LibraryWordmark.svelte';
	import FrontByline from './FrontByline.svelte';
	import PremiumTag from '../PremiumTag.svelte';
	import LibraryPremiumTile from './LibraryPremiumTile.svelte';

	/**
	 * Library department — a mini library: the newest pieces (articles,
	 * video entries, bonus matches) each as its own card in a hairline
	 * mosaic. Card variants cycle by position so the grid reads as a
	 * composed page rather than a list:
	 *   0 feature  — wide, image + copy, spans two rows at lg
	 *   1,2        — standard image cards stacked beside the feature
	 *   3 ink      — text-only on ink, big serif title
	 *   4,6        — standard
	 *   5 row      — thumbnail-left row on toned paper
	 *   6 wide     — full-width horizontal card, image beside copy
	 */
	/** @type {{ items: any[], premiumTile?: boolean }} */
	let { items = [], premiumTile = false } = $props();

	const VARIANT = ['feature', 'standard', 'standard', 'ink', 'standard', 'row', 'wide'];
	const variant = (i) => VARIANT[i] ?? (i % 3 === 0 ? 'ink' : 'standard');
	const span = {
		feature: 'sm:col-span-2 lg:col-span-8 lg:row-span-2',
		standard: 'lg:col-span-4',
		ink: 'lg:col-span-4',
		row: 'sm:col-span-2 lg:col-span-4',
		wide: 'sm:col-span-2 lg:col-span-12'
	};
</script>

{#if items.length}
	<section class="mx-auto w-full max-w-[1200px] px-5 md:px-8">
		<!-- department head: the Library page's wordmark -->
		<div id="library" class="scroll-mt-6">
			<div
				class="flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-between md:gap-10"
			>
				<h2 class="flex items-end leading-none">
					<a href="/library" class="flex items-end" aria-label="The Library"
						><LibraryWordmark size="md" tone="light" /></a
					>
				</h2>
				<div class="text-center md:max-w-[340px] md:pb-2 md:text-right">
					<p class="font-newsreader text-[16px] leading-[1.4] text-soft italic md:text-[18px]">
						Reporting, strategy and gameplay from the players who define the format.
					</p>
					<a
						href="/library"
						class="mt-2 inline-block text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:text-warm"
						>Browse the library →</a
					>
				</div>
			</div>
			<div class="mt-5 h-[5px] border-t border-b border-ink md:mt-6" aria-hidden="true"></div>
		</div>
		<div
			class="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 md:mt-10 lg:grid-cols-12"
		>
			{#each items as it, i (it.href)}
				{@const v = variant(i)}
				{@const isVideo = it.kind === 'video'}
				{#if v === 'ink'}
					<a href={it.href} class="group flex flex-col bg-ink p-6 text-paper-bg md:p-7 {span[v]}">
						<span
							class="flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.18em] text-warm-light uppercase"
						>
							{#if isVideo}<span
									class="flex h-4 w-4 items-center justify-center bg-warm pl-[1px] text-[7px] text-white"
									aria-hidden="true">▶</span
								>{/if}
							{it.rubric}
						</span>
						<h3
							class="mt-4 font-newsreader text-[26px] leading-[1.05] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[30px]"
						>
							<span class="fp-ul">{it.title}</span>
						</h3>
						{#if it.dek}
							<p
								class="mt-3 line-clamp-4 font-newsreader text-[15px] leading-[1.5] text-paper-bg/70 italic"
							>
								{it.dek}
							</p>
						{/if}
						<div class="mt-auto pt-5">
							<FrontByline
								author={it.author}
								length={it.length}
								premium={it.premium}
								size="sm"
								onDark
							/>
						</div>
					</a>
				{:else if v === 'row'}
					<div class="grid gap-px {span[v]}">
						<a
							href={it.href}
							class="group grid grid-cols-[132px_1fr] items-center gap-4 bg-paper p-4 md:p-5"
						>
							<span class="relative block aspect-video overflow-hidden bg-panel">
								<img
									class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
									src={it.image}
									alt={it.alt}
									loading="lazy"
								/>
								{#if isVideo}<span
										class="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center bg-warm pl-[2px] text-[9px] text-white"
										aria-hidden="true">▶</span
									>{/if}
							</span>
							<span class="min-w-0">
								<span
									class="block text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase"
									>{it.rubric}</span
								>
								<span class="mt-1.5 block font-newsreader text-[18px] leading-[1.15] font-semibold"
									><span class="fp-ul">{it.title}</span></span
								>
								<span class="mt-2 block"
									><FrontByline
										author={it.author}
										length={it.length}
										premium={it.premium}
										size="sm"
									/></span
								>
							</span>
						</a>
						{#if premiumTile}<LibraryPremiumTile class="sm:col-span-2 lg:col-span-1" />{/if}
					</div>
				{:else if v === 'wide'}
					<a
						href={it.href}
						class="group grid grid-cols-1 bg-paper-bg lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] {span[
							v
						]}"
					>
						<span class="relative block aspect-video overflow-hidden bg-panel">
							<img
								class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
								src={it.image}
								alt={it.alt}
								loading="lazy"
							/>
							{#if isVideo}<span
									class="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center bg-warm pl-[2px] text-[11px] text-white"
									aria-hidden="true">▶</span
								>{/if}
							{#if it.premium}<PremiumTag variant="corner" />{/if}
						</span>
						<span class="flex flex-col justify-center p-5 md:p-8 lg:border-l lg:border-line">
							<span class="block text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase"
								>{it.rubric}</span
							>
							<span
								class="mt-2 block font-newsreader text-[24px] leading-[1.08] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[30px]"
								><span class="fp-ul">{it.title}</span></span
							>
							{#if it.dek}<span
									class="mt-3 line-clamp-3 block font-newsreader text-[15px] leading-[1.5] text-soft italic md:text-[16px]"
									>{it.dek}</span
								>{/if}
							<span class="mt-4 block"
								><FrontByline
									author={it.author}
									date={it.date}
									length={it.length}
									premium={false}
									size="sm"
								/></span
							>
						</span>
					</a>
				{:else}
					{@const feature = v === 'feature'}
					<a href={it.href} class="group flex flex-col bg-paper-bg {span[v]}">
						<span class="relative block aspect-video overflow-hidden bg-panel">
							<img
								class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
								src={it.image}
								alt={it.alt}
								loading="lazy"
							/>
							{#if isVideo}
								<span
									class="absolute right-0 bottom-0 flex items-center justify-center bg-warm text-white {feature
										? 'h-10 w-10 pl-[3px] text-[13px]'
										: 'h-7 w-7 pl-[2px] text-[10px]'}"
									aria-hidden="true">▶</span
								>
							{/if}
							{#if it.premium}<PremiumTag variant="corner" size={feature ? 'lg' : 'md'} />{/if}
						</span>
						<span class="flex flex-1 flex-col {feature ? 'p-6 md:p-8' : 'p-5'}">
							<span class="block text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase"
								>{it.rubric}</span
							>
							<span
								class="mt-2 block font-newsreader font-semibold tracking-[-0.01em] [text-wrap:balance] {feature
									? 'text-[28px] leading-[1.04] md:text-[clamp(30px,2.8vw,40px)]'
									: 'text-[20px] leading-[1.12]'}"
							>
								<span class="fp-ul">{it.title}</span>
							</span>
							{#if it.dek && feature}
								<span
									class="mt-3 line-clamp-3 block font-newsreader text-[16px] leading-[1.5] text-soft italic md:text-[17px]"
									>{it.dek}</span
								>
							{:else if it.dek}
								<span
									class="mt-2 line-clamp-2 block font-newsreader text-[14px] leading-[1.45] text-soft italic"
									>{it.dek}</span
								>
							{/if}
							<span class="mt-auto block pt-4">
								<FrontByline
									author={it.author}
									date={feature ? it.date : ''}
									length={it.length}
									premium={false}
									size="sm"
								/>
							</span>
						</span>
					</a>
				{/if}
			{/each}
			{#if premiumTile && !items.some((_, i) => variant(i) === 'row')}
				<LibraryPremiumTile class="sm:col-span-2 lg:col-span-4" />
			{/if}
		</div>
	</section>
{/if}
