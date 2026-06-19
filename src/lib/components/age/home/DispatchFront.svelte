<script>
	/**
	 * A3 unified homepage — Front section. Tailwind-only.
	 *
	 * 3-column grid: vertical gutter label / video lead hero / "Across AGE"
	 * digest with 4 mini-rows colored per category.
	 */

	/**
	 * @typedef {Object} FrontData
	 * @property {{ title: string, eyebrow: string, image: string, duration: string, stand: string, event: string }} lead
	 * @property {{ image: string, title: string, meta: string }} watch
	 * @property {{ day: string, month: string, city: string, venue: string, seats: string, circuit: 'la' | 'stl' | 'ne' }} event
	 * @property {{ image: string, title: string, progress: number }} academy
	 * @property {{ show: string, ep: string | number, duration: string }} podcast
	 */

	/** @type {{ data?: FrontData }} */
	let { data } = $props();

	const D = $derived(data ?? {
		lead: {
			title: 'Gravy Bones vs Prism',
			eyebrow: '▶ Featured Match',
			image: 'https://www.age.events/banner/age-open-banner.webp',
			duration: '58 min',
			stand:
				"Two of the season's tightest pilots trade blows in the LA Open final — the complete match, start to finish, with live commentary from the booth.",
			event: 'AGE Open · Los Angeles'
		},
		watch: {
			image: 'https://www.age.events/banner/age-open-banner.webp',
			title: 'LA Open Final — Gravy Bones vs Prism',
			meta: '58 min · Top 8'
		},
		event: {
			day: '21',
			month: 'JUN',
			city: 'St. Louis',
			venue: 'St. Louis Convention Hall',
			seats: 'Open',
			circuit: 'stl'
		},
		academy: {
			image: 'https://www.age.events/banner/academy-banner.webp',
			title: 'Reading the Board: Decision-Making in CC',
			progress: 42
		},
		podcast: {
			show: 'Cardboard & Beyond',
			ep: 47,
			duration: '64 min'
		}
	});

	const CIRCUIT_LABEL = { la: 'LA', stl: 'STL', ne: 'NE' };

	// Circuit color (used for the Events row accent).
	const CIRCUIT_HEX = {
		la: 'var(--ed-cc-la)',
		stl: 'var(--ed-cc-stl)',
		ne: 'var(--ed-cc-ne)'
	};
	const eventAccent = $derived(CIRCUIT_HEX[D.event.circuit]);
</script>

<div class="border-ink border-b-[3px] border-double">
<div class="mx-auto grid w-full max-w-[min(94vw,1920px)] grid-cols-[30px_1.55fr_1fr]">
	<!-- gutter -->
	<div class="border-line flex items-start justify-center border-r pt-[34px]">
		<span
			class="text-fade text-[10px] font-extrabold tracking-[0.32em] uppercase"
			style="writing-mode: vertical-rl; transform: rotate(180deg);"
		>
			The Main Event
		</span>
	</div>

	<!-- video lead -->
	<a
		href="/library"
		class="group border-line2 relative block border-r pt-[34px] pr-[44px] pb-[40px] pl-[36px]"
	>
		<div
			class="bg-panel relative z-[1] aspect-video w-full bg-cover bg-center cursor-pointer"
			style="background-image: url('{D.lead.image}');"
		>
			<!-- bottom-fade overlay -->
			<span
				class="absolute inset-0 z-[1] bg-gradient-to-t from-black/40 to-transparent to-[56%]"
				aria-hidden="true"
			></span>

			<!-- live badge -->
			<span
				class="bg-warm absolute top-4 left-4 z-[2] inline-flex items-center gap-[7px] px-[11px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] text-white uppercase"
			>
				<span class="inline-block h-[7px] w-[7px] rounded-full bg-white"></span>
				Now Streaming
			</span>

			<!-- play -->
			<span
				class="absolute top-1/2 left-1/2 z-[2] flex h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 pl-[6px] text-[27px] text-[#17150f] transition-transform group-hover:scale-[1.06]"
			>
				▶
			</span>

			<!-- duration -->
			<span
				class="absolute top-4 right-4 z-[2] bg-black/85 px-[11px] py-[5px] text-xs font-bold text-white"
			>
				{D.lead.duration}
			</span>
		</div>

		<div class="bg-paper-bg relative z-[2] mt-[-72px] mr-10 pt-[22px] pr-7">
			<span
				class="bg-warm mb-[14px] inline-block px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.14em] text-white uppercase"
			>
				{D.lead.eyebrow}
			</span>
			<h1
				class="font-newsreader text-[62px] leading-[0.96] font-semibold tracking-[-0.01em]"
			>
				{D.lead.title}
			</h1>
		</div>

		<p
			class="text-soft my-[18px] max-w-[640px] text-[19px] leading-[1.55] first-letter:font-newsreader first-letter:float-left first-letter:mt-[7px] first-letter:mr-3 first-letter:text-[62px] first-letter:leading-[0.7] first-letter:font-semibold first-letter:text-warm"
		>
			{D.lead.stand}
		</p>

		<div class="text-fade flex flex-wrap items-center gap-2 text-xs font-semibold">
			<span>{D.lead.event}</span><span>·</span><span>Full match</span><span>·</span><span
				>{D.lead.duration}</span
			>
		</div>
	</a>

	<!-- Across AGE digest -->
	<!-- Across AGE — extends its paper background past the content cap
		 to the viewport edge so the column doesn't get visually cut off
		 in the right gutter on wide screens. -->
	<div
		class="bg-paper relative flex flex-col pt-[30px] pr-14 pb-[34px] pl-10 before:absolute before:inset-y-0 before:left-full before:w-screen before:bg-paper before:content-['']"
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

		<!-- Watch row -->
		<a
			href="/library"
			class="bg-paper-bg group border-warm hover:shadow-[-3px_0_0_0_var(--ed-warm)] relative mt-[10px] grid grid-cols-[60px_1fr] items-center gap-[14px] border-l-[3px] py-[13px] pr-[30px] pl-[13px] transition-[transform,box-shadow] duration-[160ms] ease-out hover:translate-x-[3px]"
		>
			<div
				class="bg-panel h-[60px] bg-cover bg-center"
				style="background-image: url('{D.watch.image}');"
			></div>
			<div class="min-w-0">
				<span
					class="text-warm mb-[5px] inline-flex items-center gap-[7px] text-[9.5px] font-extrabold tracking-[0.11em] uppercase"
				>
					<span class="bg-warm inline-block h-[5px] w-[5px] rounded-full"></span>
					Watch · Studios
				</span>
				<h4
					class="font-newsreader group-hover:text-warm text-[17px] leading-[1.08] font-semibold tracking-[-0.01em] transition-colors"
				>
					{D.watch.title}
				</h4>
				<div class="text-fade mt-[5px] text-[11px] font-semibold">{D.watch.meta}</div>
			</div>
			<span
				class="text-warm pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 -translate-x-1 text-[15px] font-extrabold opacity-0 transition-[opacity,transform] duration-[160ms] ease-out group-hover:translate-x-0 group-hover:opacity-100"
				aria-hidden="true">→</span
			>
		</a>

		<!-- Events row -->
		<a
			href="/age-open"
			class="group bg-paper-bg relative mt-[10px] grid grid-cols-[60px_1fr] items-center gap-[14px] border-l-[3px] py-[13px] pr-[30px] pl-[13px] transition-[transform,box-shadow] duration-[160ms] ease-out hover:translate-x-[3px]"
			style="border-left-color: {eventAccent}; --hover-shadow: {eventAccent};"
		>
			<div
				class="flex flex-col items-center justify-center px-[2px] py-[8px] text-white"
				style="background: {eventAccent};"
			>
				<div class="font-newsreader text-[26px] leading-[0.8] font-semibold">{D.event.day}</div>
				<div class="mt-[3px] text-[9px] font-extrabold tracking-[0.12em]">{D.event.month}</div>
			</div>
			<div class="min-w-0">
				<span
					class="mb-[5px] inline-flex items-center gap-[7px] text-[9.5px] font-extrabold tracking-[0.11em] uppercase"
					style="color: {eventAccent};"
				>
					<span
						class="inline-block h-[5px] w-[5px] rounded-full"
						style="background: {eventAccent};"
					></span>
					Events · AGE Open
					<em
						class="ml-[1px] px-[5px] py-px text-[8.5px] font-extrabold tracking-[0.08em] not-italic"
						style="color: {eventAccent}; border: 1px solid color-mix(in srgb, {eventAccent} 45%, transparent);"
					>
						{CIRCUIT_LABEL[D.event.circuit] ?? ''}
					</em>
				</span>
				<h4
					class="font-newsreader text-[17px] leading-[1.08] font-semibold tracking-[-0.01em] transition-colors"
					style="--cat: {eventAccent};"
				>
					{D.event.city}
				</h4>
				<div class="text-fade mt-[5px] text-[11px] font-semibold">
					{D.event.venue} · {D.event.seats}
				</div>
			</div>
		</a>

		<!-- Academy row -->
		<a
			href="/academy"
			class="group bg-paper-bg border-gold relative mt-[10px] grid grid-cols-[60px_1fr] items-center gap-[14px] border-l-[3px] py-[13px] pr-[30px] pl-[13px] transition-[transform,box-shadow] duration-[160ms] ease-out hover:translate-x-[3px]"
		>
			<div
				class="bg-panel h-[60px] bg-cover bg-center"
				style="background-image: url('{D.academy.image}');"
			></div>
			<div class="min-w-0">
				<span
					class="text-gold mb-[5px] inline-flex items-center gap-[7px] text-[9.5px] font-extrabold tracking-[0.11em] uppercase"
				>
					<span class="bg-gold inline-block h-[5px] w-[5px] rounded-full"></span>
					Academy · Course
				</span>
				<h4
					class="font-newsreader group-hover:text-gold text-[17px] leading-[1.08] font-semibold tracking-[-0.01em] transition-colors"
				>
					{D.academy.title}
				</h4>
				<div class="bg-line mt-2 h-1 max-w-[150px] overflow-hidden">
					<i class="bg-gold block h-full" style="width: {D.academy.progress}%;"></i>
				</div>
			</div>
		</a>

		<!-- Podcast row -->
		<a
			href="/podcasts"
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
