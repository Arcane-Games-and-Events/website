<script>
	import FrontDept from './FrontDept.svelte';

	/**
	 * Academy department — a toned paper band with gold accents: the
	 * featured course with a gold plate, beside a short catalogue.
	 */
	/** @type {{ data: { featured: any, list: any[], live: boolean } }} */
	let { data } = $props();
	const F = $derived(data?.featured ?? null);
	const list = $derived(data?.list ?? []);
	const meta = $derived((c) =>
		[c?.lessons ? `${c.lessons} lessons` : '', c?.runtime].filter(Boolean).join(' · ')
	);
</script>

{#if F}
	<section class="w-full border-y border-line bg-paper py-12 md:py-16">
		<div class="mx-auto w-full max-w-[1200px] px-5 md:px-8">
			<FrontDept
				id="academy"
				title="Academy"
				strap="Courses from the players who define the format. Buy once, keep for life."
				href="/academy"
				label="All courses"
			/>

			<div class="mt-8 md:mt-10 lg:grid lg:grid-cols-[1.35fr_1fr] lg:gap-16">
				<a href={F.href} class="group block md:grid md:grid-cols-[1fr_1fr] md:gap-10 lg:block">
					<div class="fp-plate-gold relative aspect-video overflow-hidden bg-panel">
						<div
							class="absolute inset-0 bg-cover bg-center transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
							style="background-image: url('{F.image}');"
						></div>
						<span
							class="absolute top-0 left-0 bg-gold px-3 py-1.5 text-[9.5px] font-extrabold tracking-[0.18em] text-[#241b07] uppercase"
						>
							Featured course
						</span>
					</div>
					<div class="pt-7 md:pt-0 lg:pt-7">
						<div class="text-[10.5px] font-extrabold tracking-[0.2em] text-gold uppercase">
							{F.price > 0 ? `$${F.price} · Lifetime access` : 'Free course'}
						</div>
						<h3
							class="mt-3 font-newsreader text-[28px] leading-[1.06] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[36px]"
						>
							<span class="fp-ul">{F.title}</span>
						</h3>
						{#if F.dek}
							<p
								class="mt-4 font-newsreader text-[16px] leading-[1.5] text-soft italic first-letter:float-left first-letter:mt-[5px] first-letter:mr-2 first-letter:text-[48px] first-letter:leading-[0.7] first-letter:font-semibold first-letter:text-gold first-letter:not-italic md:text-[17px]"
							>
								{F.dek}
							</p>
						{/if}
						<div class="mt-5 text-[11px] text-fade">
							<span class="font-extrabold tracking-[0.12em] text-ink uppercase"
								>With {F.instructor}</span
							>{#if meta(F)}<span class="font-semibold"> · {meta(F)}</span>{/if}
						</div>
						<span
							class="mt-6 inline-flex items-center bg-ink px-6 py-3.5 text-[11px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-[filter,letter-spacing] group-hover:tracking-[0.2em] group-hover:brightness-125"
						>
							{F.price > 0 ? `Enroll · $${F.price}` : 'Start free'}
						</span>
					</div>
				</a>

				{#if list.length}
					<div class="mt-10 border-t-[3px] border-double border-gold pt-3 lg:mt-0">
						<h4
							class="flex items-center gap-2 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
						>
							<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
							More courses
						</h4>
						<ul class="mt-1 divide-y divide-line">
							{#each list as c (c.href + c.title)}
								<li>
									<a
										href={c.href}
										class="group grid grid-cols-[72px_1fr_auto] items-center gap-4 py-4 md:py-5"
									>
										<span class="relative block aspect-square w-[72px] overflow-hidden bg-panel">
											<span
												class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.06]"
												style="background-image: url('{c.image}');"
											></span>
										</span>
										<span class="min-w-0">
											<span
												class="block font-newsreader text-[18px] leading-[1.18] font-semibold md:text-[19px]"
											>
												<span class="fp-ul">{c.title}</span>
											</span>
											<span class="mt-1.5 block text-[10.5px] text-fade">
												<span class="font-extrabold tracking-[0.1em] text-ink uppercase"
													>{c.instructor}</span
												>{#if meta(c)}<span class="font-semibold"> · {meta(c)}</span>{/if}
											</span>
										</span>
										<span
											class="font-newsreader text-[22px] font-semibold whitespace-nowrap text-gold tabular-nums"
										>
											{c.price > 0 ? `$${c.price}` : 'Free'}
										</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
	</section>
{/if}
