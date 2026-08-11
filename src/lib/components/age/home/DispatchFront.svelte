<script>
	import EventRow from '$lib/components/age/EventRow.svelte';

	/**
	 * A3 unified homepage — Front section. Tailwind-only.
	 *
	 * 3-column grid: vertical gutter label / video lead hero / "Across AGE"
	 * digest with 4 mini-rows colored per category.
	 */

	/**
	 * @typedef {Object} CrossEvent
	 * @property {string} day
	 * @property {string} month
	 * @property {string} city
	 * @property {string} venue
	 * @property {string} seats
	 * @property {'la' | 'stl' | 'ne'} circuit
	 * @property {string} [href]
	 */

	/**
	 * @typedef {Object} FrontData
	 * @property {{ type?: 'article' | 'video', title: string, eyebrow: string, image: string, duration?: string, stand: string, event: string, href?: string, author?: string, readTime?: string, premium?: boolean }} lead
	 * @property {{ type: 'video' | 'article', title: string, meta: string, image?: string, duration?: string, href: string } | null} [latest]
	 * @property {CrossEvent[]} [events]
	 * @property {{ title: string, meta: string, image?: string, duration?: string, href: string } | null} [bonusMatch]
	 * @property {{ show: string, ep: string | number, duration: string, href?: string }} podcast
	 */

	/** @type {{ data?: FrontData }} */
	let { data } = $props();

	const D = $derived(data ?? {
		lead: {
			type: 'article',
			title: 'They reminisce over you — a weekend in Memphis',
			eyebrow: 'AGE Open',
			image: 'https://www.age.events/banner/articles-banner.webp',
			stand:
				"Inside the season's biggest open: the rooms, the rivalries, and the Top 8 nobody saw coming.",
			event: 'AGE Open · Los Angeles',
			author: 'Joaquin Park',
			readTime: '9 min read',
			href: '/library',
			premium: false
		},
		latest: {
			type: 'article',
			title: 'They reminisce over you — a weekend in Memphis',
			meta: 'Joaquin Park · 8 min read',
			image: 'https://www.age.events/banner/articles-banner.webp',
			href: '/library'
		},
		events: [
			{
				day: '21', month: 'JUN', city: 'St. Louis',
				venue: 'St. Louis Convention Hall', seats: 'Open', circuit: 'stl', href: '/age-open'
			},
			{
				day: '12', month: 'JUL', city: 'Los Angeles',
				venue: 'TopDeck Keep', seats: 'Sold out', circuit: 'la', href: '/age-open'
			},
			{
				day: '03', month: 'AUG', city: 'Boston',
				venue: 'Salem Gaming Co.', seats: '18 / 48', circuit: 'ne', href: '/age-open'
			}
		],
		bonusMatch: {
			title: 'LA Open Final — Gravy Bones vs Prism',
			meta: '58 min · LA Open',
			image: 'https://www.age.events/banner/age-open-banner.webp',
			duration: '58 min',
			href: '/library'
		},
		podcast: {
			show: 'Cardboard & Beyond',
			ep: 47,
			duration: '64 min',
			href: '/podcasts'
		}
	});

	const leadIsVideo = $derived(D.lead?.type === 'video');

	const CIRCUIT_LABEL = { la: 'LA', stl: 'STL', ne: 'NE' };

	// Circuit color (used for the Events row accent).
	const CIRCUIT_HEX = {
		la: 'var(--ed-cc-la)',
		stl: 'var(--ed-cc-stl)',
		ne: 'var(--ed-cc-ne)'
	};
</script>

<div class="border-ink border-b-[3px] border-double">
<div class="mx-auto grid w-full max-w-[1600px] grid-cols-1 lg:grid-cols-[30px_1.55fr_1fr]">
	<!-- gutter — hidden on mobile; the vertical label doesn't add value in a stacked layout -->
	<div class="border-line hidden items-start justify-center border-r pt-[34px] lg:flex">
		<span
			class="text-fade text-[10px] font-extrabold tracking-[0.32em] uppercase"
			style="writing-mode: vertical-rl; transform: rotate(180deg);"
		>
			New from AGE
		</span>
	</div>

	<!--
		Lead pane — labeled "New from AGE" in the vertical gutter to the
		left. Renders the newest Library article today; the video branch
		below is retained for when a "library video" flag lands on the
		VOD schema so we can promote curated VODs into this slot. The
		article branch deliberately drops the play-button / duration /
		"Now Streaming" badge so it doesn't visually impersonate a video.
	-->
	<a
		href={D.lead.href ?? '/library'}
		class="group border-line2 relative block pt-8 pr-4 pb-10 pl-4 md:pt-[34px] md:pr-[44px] md:pb-[40px] md:pl-[36px] lg:border-r"
	>
		<div
			class="bg-panel relative z-[1] aspect-video w-full bg-cover bg-center"
			style="background-image: url('{D.lead.image}');"
		>
			<!-- bottom-fade overlay (used by both branches for headline contrast) -->
			<span
				class="absolute inset-0 z-[1] bg-gradient-to-t from-black/40 to-transparent to-[56%]"
				aria-hidden="true"
			></span>

			{#if leadIsVideo}
				<!-- VIDEO BRANCH — used when the top library entry is a video (Mux
				     or YouTube). Matches the article branch's "Cover Story · Article"
				     shape so the eye reads the same slot in both cases. -->
				<span
					class="bg-warm absolute top-4 left-4 z-[2] inline-flex items-center gap-[7px] px-[11px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] text-white uppercase"
				>
					<span class="inline-block h-[7px] w-[7px] rounded-full bg-white"></span>
					Cover Story · Video
				</span>
				<span
					class="absolute top-1/2 left-1/2 z-[2] flex h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 pl-[6px] text-[27px] text-[#17150f] transition-transform group-hover:scale-[1.06]"
				>
					▶
				</span>
				{#if D.lead.duration}
					<span
						class="absolute top-4 right-4 z-[2] bg-black/85 px-[11px] py-[5px] text-xs font-bold text-white"
					>
						{D.lead.duration}
					</span>
				{/if}
			{:else}
				<!-- ARTICLE BRANCH — Premium tag stays so a paywalled lead reads clearly -->
				<span
					class="bg-accent absolute top-4 left-4 z-[2] inline-flex items-center gap-[7px] px-[11px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] text-white uppercase"
				>
					Cover Story · Article
				</span>
				{#if D.lead.premium}
					<span
						class="bg-prem absolute top-4 right-4 z-[2] px-[11px] py-[5px] text-[10px] font-extrabold tracking-[0.12em] text-white uppercase"
					>
						Premium
					</span>
				{/if}
			{/if}
		</div>

		<div class="bg-paper-bg relative z-[2] -mt-8 pt-4 sm:mr-6 md:mt-[-72px] md:mr-10 md:pt-[22px] md:pr-7">
			<span
				class="mb-[14px] inline-block px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.14em] text-white uppercase {leadIsVideo
					? 'bg-warm'
					: 'bg-accent'}"
			>
				{D.lead.eyebrow}
			</span>
			<h1
				class="font-newsreader text-[clamp(32px,6vw,62px)] leading-[0.96] font-semibold tracking-[-0.01em]"
			>
				{D.lead.title}
			</h1>
		</div>

		<p
			class="text-soft my-[18px] max-w-[640px] text-[16px] leading-[1.55] first-letter:font-newsreader first-letter:float-left first-letter:mt-[7px] first-letter:mr-3 first-letter:text-[clamp(40px,7vw,62px)] first-letter:leading-[0.7] first-letter:font-semibold sm:text-[19px] {leadIsVideo
				? 'first-letter:text-warm'
				: 'first-letter:text-accent'}"
		>
			{D.lead.stand}
		</p>

		<div class="text-fade flex flex-wrap items-center gap-2 text-xs font-semibold">
			{#if leadIsVideo}
				<span>{D.lead.event}</span><span>·</span><span>Video</span>
				{#if D.lead.duration}
					<span>·</span><span>{D.lead.duration}</span>
				{/if}
			{:else}
				{#if D.lead.author}
					<span>By {D.lead.author}</span>
				{/if}
				{#if D.lead.author && D.lead.readTime}
					<span>·</span>
				{/if}
				{#if D.lead.readTime}
					<span>{D.lead.readTime}</span>
				{/if}
				{#if (D.lead.author || D.lead.readTime) && D.lead.event}
					<span>·</span>
				{/if}
				{#if D.lead.event}
					<span>{D.lead.event}</span>
				{/if}
			{/if}
		</div>
	</a>

	<!-- Across AGE digest -->
	<!-- Across AGE — extends its paper background past the content cap
		 to the viewport edge so the column doesn't get visually cut off
		 in the right gutter on wide screens. -->
	<div
		class="bg-paper relative flex flex-col px-4 pt-6 pb-8 sm:px-10 md:pr-14 md:pl-10 md:pt-[30px] md:pb-[34px] lg:before:absolute lg:before:inset-y-0 lg:before:left-full lg:before:w-screen lg:before:bg-paper lg:before:content-['']"
	>
		<header class="mb-[6px]">
			<div
				class="text-warm flex items-center gap-[10px] text-[10px] font-extrabold tracking-[0.2em] uppercase"
			>
				The whole community
				<span class="bg-line2 h-px flex-1"></span>
			</div>
			<h3
				class="font-newsreader mt-[9px] mb-[6px] text-[36px] font-semibold tracking-[-0.015em]"
			>
				Across AGE
			</h3>
			<div class="flex items-baseline justify-between gap-[14px] pb-1">
				<p class="text-soft m-0 max-w-[280px] text-[12.5px] leading-[1.4]">
					Everything happening right now — watch, compete, learn, and listen.
				</p>
				<a
					href="/library"
					class="text-accent text-[10.5px] font-extrabold tracking-[0.08em] whitespace-nowrap uppercase"
				>
					Explore all →
				</a>
			</div>
		</header>

		<!--
			Across AGE digest rows — ordered:
			1. Latest article OR video (whichever is newest by date)
			2-4. Next 3 upcoming AGE Open events (ascending date)
			5. Latest Bonus Match VOD (de-duped against row 1 so we
			   don't show the same match twice)
			6. Latest podcast episode
		-->

		<!-- Latest article or video -->
		{#if D.latest}
			{@const isLatestVideo = D.latest.type === 'video'}
			<a
				href={D.latest.href}
				class="bg-paper-bg group relative mt-[10px] grid grid-cols-[60px_1fr] items-center gap-[14px] border-l-[3px] py-[13px] pr-[30px] pl-[13px] transition-[transform,box-shadow] duration-[160ms] ease-out hover:translate-x-[3px] {isLatestVideo
					? 'border-warm hover:shadow-[-3px_0_0_0_var(--ed-warm)]'
					: 'border-accent hover:shadow-[-3px_0_0_0_var(--ed-accent)]'}"
			>
				<div
					class="bg-panel relative h-[60px] bg-cover bg-center"
					style={D.latest.image ? `background-image: url('${D.latest.image}');` : ''}
				>
					{#if isLatestVideo}
						<span
							class="text-ink absolute top-1/2 left-1/2 flex h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 pl-[2px] text-[10px]"
						>
							▶
						</span>
					{/if}
				</div>
				<div class="min-w-0">
					<span
						class="mb-[5px] inline-flex items-center gap-[7px] text-[9.5px] font-extrabold tracking-[0.11em] uppercase {isLatestVideo
							? 'text-warm'
							: 'text-accent'}"
					>
						<span
							class="inline-block h-[5px] w-[5px] rounded-full {isLatestVideo
								? 'bg-warm'
								: 'bg-accent'}"
						></span>
						{isLatestVideo ? 'Latest · Video' : 'Latest · Article'}
					</span>
					<h4
						class="font-newsreader text-[17px] leading-[1.08] font-semibold tracking-[-0.01em] transition-colors {isLatestVideo
							? 'group-hover:text-warm'
							: 'group-hover:text-accent'}"
					>
						{D.latest.title}
					</h4>
					<div class="text-fade mt-[5px] text-[11px] font-semibold">{D.latest.meta}</div>
				</div>
				<span
					class="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 -translate-x-1 text-[15px] font-extrabold opacity-0 transition-[opacity,transform] duration-[160ms] ease-out group-hover:translate-x-0 group-hover:opacity-100 {isLatestVideo
						? 'text-warm'
						: 'text-accent'}"
					aria-hidden="true">→</span
				>
			</a>
		{/if}

		<!--
			Next 3 upcoming events — uses the shared EventRow component
			so the homepage digest, the Hub sidebar, and the AGE Open
			events tab all render the same row treatment.
		-->
		{#each D.events ?? [] as ev, i (i)}
			<div class="mt-[10px]">
				<EventRow
					day={ev.day}
					month={ev.month}
					circuit={ev.circuit}
					title={ev.city}
					venue={ev.venue}
					seats={ev.seats}
					href={ev.href ?? '/age-open'}
					size="md"
					showEyebrow={true}
				/>
			</div>
		{/each}

		<!-- Latest bonus match VOD -->
		{#if D.bonusMatch}
			<a
				href={D.bonusMatch.href}
				class="bg-paper-bg group border-warm hover:shadow-[-3px_0_0_0_var(--ed-warm)] relative mt-[10px] grid grid-cols-[60px_1fr] items-center gap-[14px] border-l-[3px] py-[13px] pr-[30px] pl-[13px] transition-[transform,box-shadow] duration-[160ms] ease-out hover:translate-x-[3px]"
			>
				<div
					class="bg-panel relative h-[60px] bg-cover bg-center"
					style={D.bonusMatch.image
						? `background-image: url('${D.bonusMatch.image}');`
						: ''}
				>
					<span
						class="text-ink absolute top-1/2 left-1/2 flex h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 pl-[2px] text-[10px]"
					>
						▶
					</span>
				</div>
				<div class="min-w-0">
					<span
						class="text-warm mb-[5px] inline-flex items-center gap-[7px] text-[9.5px] font-extrabold tracking-[0.11em] uppercase"
					>
						<span class="bg-warm inline-block h-[5px] w-[5px] rounded-full"></span>
						Watch · Bonus Match
					</span>
					<h4
						class="font-newsreader group-hover:text-warm text-[17px] leading-[1.08] font-semibold tracking-[-0.01em] transition-colors"
					>
						{D.bonusMatch.title}
					</h4>
					<div class="text-fade mt-[5px] text-[11px] font-semibold">{D.bonusMatch.meta}</div>
				</div>
				<span
					class="text-warm pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 -translate-x-1 text-[15px] font-extrabold opacity-0 transition-[opacity,transform] duration-[160ms] ease-out group-hover:translate-x-0 group-hover:opacity-100"
					aria-hidden="true">→</span
				>
			</a>
		{/if}

		<!-- Latest podcast episode -->
		<a
			href={D.podcast.href ?? '/podcasts'}
			class="group bg-paper-bg border-prem relative mt-[10px] grid grid-cols-[60px_1fr] items-center gap-[14px] border-l-[3px] py-[13px] pr-[30px] pl-[13px] transition-[transform,box-shadow] duration-[160ms] ease-out hover:translate-x-[3px]"
		>
			<div class="bg-panel flex h-[60px] items-center justify-center">
				<span
					class="bg-prem flex h-[30px] w-[30px] items-center justify-center rounded-full pl-[2px] text-[11px] text-white"
				>
					▶
				</span>
			</div>
			<div class="min-w-0">
				<span
					class="text-prem mb-[5px] inline-flex items-center gap-[7px] text-[9.5px] font-extrabold tracking-[0.11em] uppercase"
				>
					<span class="bg-prem inline-block h-[5px] w-[5px] rounded-full"></span>
					Listen · Podcast
				</span>
				<h4
					class="font-newsreader group-hover:text-prem text-[17px] leading-[1.08] font-semibold tracking-[-0.01em] transition-colors"
				>
					{D.podcast.show}
				</h4>
				<div class="text-fade mt-[5px] text-[11px] font-semibold">
					Ep {D.podcast.ep} · {D.podcast.duration}
				</div>
			</div>
		</a>
	</div>
</div>
</div>
