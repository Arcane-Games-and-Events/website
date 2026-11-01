<script>
	/**
	 * Academy hero — the newest courses on the board-green band, one at a
	 * time: the cover full-bleed behind the instructor's name in big caps,
	 * what they teach, and the way in (continue, a free lesson, or enrol).
	 * Tabs along the foot switch between the four newest.
	 */
	import Picture from '$lib/components/media/Picture.svelte';
	import { formatMinutes, formatPrice } from '$lib/academy/format.js';

	/**
	 * @type {{ courses: any[], previews?: any[],
	 *   progress?: Record<string, { completed: number }> }}
	 */
	let { courses, previews = [], progress = {} } = $props();

	const heroes = $derived(courses.slice(0, 4));
	let at = $state(0);
	const hero = $derived(heroes[Math.min(at, heroes.length - 1)] ?? null);
	const free = $derived(hero ? (previews.find((l) => l.courseSlug === hero.slug) ?? null) : null);
	const started = $derived(!!(hero && progress[hero.slug]));
	const meta = $derived(
		hero
			? [hero.lessons ? `${hero.lessons} lessons` : '', formatMinutes(hero.minutes)]
					.filter(Boolean)
					.join(' · ')
			: ''
	);
	const pill =
		'inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[11px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-[color,border-color,filter]';
	const solid = `${pill} bg-gold text-[#241b07] hover:brightness-110`;
	const outline = `${pill} border border-paper-bg/40 text-paper-bg hover:border-gold hover:text-gold`;
</script>

{#if hero}
	<section class="relative isolate overflow-hidden bg-academy text-paper-bg">
		{#key hero.slug}
			<div
				class="ah-fade relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] md:absolute md:inset-0 md:aspect-auto"
			>
				{#if hero.cover}
					<!-- Every size of the cover, so wide and sharp screens get the biggest. -->
					<Picture
						image={hero.cover}
						alt=""
						sizes="100vw"
						loading="eager"
						fetchpriority="high"
						class="ah-zoom absolute inset-0 h-full w-full object-cover"
					/>
				{:else}
					<img
						src={hero.image}
						alt=""
						class="ah-zoom absolute inset-0 h-full w-full object-cover"
						fetchpriority="high"
					/>
				{/if}
				<span
					class="absolute inset-0 bg-gradient-to-t from-academy via-academy/20 to-transparent md:bg-gradient-to-r md:from-academy md:via-academy/75 md:to-transparent"
					aria-hidden="true"
				></span>
				<span
					class="absolute inset-x-0 bottom-0 hidden h-40 bg-gradient-to-t from-academy to-transparent md:block"
					aria-hidden="true"
				></span>
			</div>
		{/key}
		<div
			class="relative mx-auto -mt-16 w-full max-w-[1200px] px-5 pb-10 md:mt-0 md:flex md:min-h-[min(78vh,760px)] md:flex-col md:justify-end md:px-8 md:pt-28 md:pb-14"
		>
			{#key hero.slug}
				<div class="ah-rise max-w-[620px]">
					<p
						class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.24em] text-gold uppercase"
					>
						<span aria-hidden="true">◆</span> AGE Academy · New course
					</p>
					<h1
						class="mt-3 font-jost text-[48px] leading-[0.9] font-bold tracking-[0.01em] [text-wrap:balance] uppercase md:text-[88px]"
					>
						{hero.instructor}
					</h1>
					<p
						class="mt-3 font-newsreader text-[20px] leading-[1.2] text-paper-bg/85 italic md:text-[26px]"
					>
						Teaches {hero.title}
					</p>
					{#if hero.dek}
						<p
							class="mt-4 line-clamp-3 max-w-[540px] text-[14.5px] leading-[1.55] text-paper-bg/65"
						>
							{hero.dek}
						</p>
					{/if}
					{#if meta}
						<p class="mt-4 text-[10.5px] font-bold tracking-[0.16em] text-paper-bg/55 uppercase">
							{meta}
						</p>
					{/if}
					<div class="mt-6 flex flex-col gap-2.5 sm:flex-row">
						{#if started}
							<a href={hero.href} class={solid}>
								<span aria-hidden="true">▶</span> Continue the course
							</a>
						{:else}
							{#if free}
								<a href="/academy/{free.courseSlug}/{free.slug}" class={solid}>
									<span aria-hidden="true">{free.hasVideo ? '▶' : '¶'}</span> Try a free lesson
								</a>
							{/if}
							<a href={hero.href} class={free ? outline : solid}>
								{hero.price > 0 ? `Enroll · ${formatPrice(hero.price)}` : 'Start the course'}
							</a>
						{/if}
					</div>
				</div>
			{/key}

			{#if heroes.length > 1}
				<div
					class="st-rail -mx-5 mt-8 flex scroll-px-5 gap-2 overflow-x-auto px-5 md:mx-0 md:mt-12 md:px-0"
					role="tablist"
					aria-label="New courses"
				>
					{#each heroes as h, i (h.slug)}
						<button
							type="button"
							role="tab"
							aria-selected={i === at}
							onclick={() => (at = i)}
							class="group w-[44%] shrink-0 border-t-2 pt-3 text-left transition-colors sm:w-[30%] md:w-[220px] {i ===
							at
								? 'border-gold'
								: 'border-paper-bg/20 hover:border-paper-bg/60'}"
						>
							<span
								class="block truncate font-jost text-[13px] font-bold tracking-[0.04em] uppercase {i ===
								at
									? 'text-paper-bg'
									: 'text-paper-bg/55 group-hover:text-paper-bg'}">{h.instructor}</span
							>
							<span class="mt-0.5 block truncate text-[12px] text-paper-bg/45">{h.title}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</section>
{/if}

<style>
	.ah-fade {
		animation: ah-fade 700ms ease both;
	}
	.ah-zoom {
		animation: ah-zoom 9s cubic-bezier(0.22, 0.61, 0.36, 1) both;
	}
	.ah-rise {
		animation: ah-rise 600ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
	}
	@keyframes ah-fade {
		from {
			opacity: 0;
		}
	}
	@keyframes ah-zoom {
		from {
			transform: scale(1.06);
		}
	}
	@keyframes ah-rise {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ah-fade,
		.ah-zoom,
		.ah-rise {
			animation: none;
		}
	}
</style>
