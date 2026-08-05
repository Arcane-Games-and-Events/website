<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';

	// ============ placeholder data ============
	// Academy launches with the rest of the editorial site; until the
	// courses CMS is wired, the markup runs on these realistic-looking
	// placeholder objects so the page reads complete. Swap the arrays
	// for loaded data once the backend is ready — the templates below
	// already take the shapes we'll ship.

	const STATS = [
		{ n: '38', l: 'Courses' },
		{ n: '410+', l: 'Lessons' },
		{ n: '12k', l: 'Learners' }
	];

	// Current learner's in-progress course (drives the "Continue Learning" card)
	const CURRENT = {
		title: 'Reading the Board: Decision-Making in CC',
		level: 'Intermediate',
		lessons: 14,
		progress: 42,
		coverImage: 'https://www.age.events/banner/academy-banner.webp',
		syllabus: [
			{ title: 'What tempo actually means', done: true, time: '6 min' },
			{ title: 'Counting cards & blocking math', done: true, time: '9 min' },
			{ title: 'When to go wide vs. tall', now: true, time: '8 min' },
			{ title: 'Arsenal as a tempo tool', time: '7 min' }
		]
	};

	const TRACKS = [
		{
			title: 'Fundamentals',
			body: 'Pitch math, blocking calculus, and tempo — the foundation every competitive player needs.',
			courses: 6,
			color: '#2F7D46'
		},
		{
			title: 'Competitive Calling',
			body: 'Sideboarding, hero matchups, and tournament prep for AGE Open contenders.',
			courses: 9,
			color: '#16489E'
		},
		{
			title: 'Format Mastery',
			body: 'Deep dives by format — Classic Constructed, Blitz, Living Legend, and Sealed.',
			courses: 12,
			color: '#C0461F'
		}
	];

	const COURSES = [
		{
			title: 'Punishing the Mirror',
			level: 'Advanced',
			lessons: 9,
			minutes: 84,
			rating: 4.9,
			students: 1840,
			progress: 0,
			free: false,
			price: 24,
			image: 'https://www.age.events/banner/articles-banner.webp'
		},
		{
			title: 'Reading the Board: Decision-Making in CC',
			level: 'Intermediate',
			lessons: 14,
			minutes: 126,
			rating: 4.8,
			students: 3210,
			progress: 42,
			free: false,
			price: 32,
			image: 'https://www.age.events/banner/academy-banner.webp'
		},
		{
			title: 'Sideboarding for Sealed',
			level: 'Beginner',
			lessons: 7,
			minutes: 48,
			rating: 4.7,
			students: 2470,
			progress: 0,
			free: true,
			price: 0,
			image: 'https://www.age.events/banner/studios-banner.webp'
		},
		{
			title: 'Tempo & Tempo Loss',
			level: 'Intermediate',
			lessons: 11,
			minutes: 92,
			rating: 4.9,
			students: 1990,
			progress: 100,
			free: false,
			price: 28,
			image: 'https://www.age.events/banner/age-open-banner.webp'
		},
		{
			title: 'Mulligan Theory',
			level: 'Beginner',
			lessons: 5,
			minutes: 34,
			rating: 4.6,
			students: 4120,
			progress: 0,
			free: true,
			price: 0,
			image: 'https://www.age.events/hero_images/prism-awakener-of-sol.webp'
		},
		{
			title: 'Calling the Bluff — Reads & Tells',
			level: 'Advanced',
			lessons: 8,
			minutes: 71,
			rating: 4.9,
			students: 920,
			progress: 18,
			free: false,
			price: 36,
			image: 'https://www.age.events/hero_images/arakni-marionette.webp'
		}
	];

	const VODS = [
		{
			title: 'The LA Open final, in full',
			meta: '58 min · AGE Studios · LA Open',
			image: 'https://www.age.events/banner/age-open-banner.webp',
			duration: '58:00'
		},
		{
			title: 'How Wesley netdecked Memphis',
			meta: '34 min · Deck Tech · Wesley Dong',
			image: 'https://www.age.events/banner/articles-banner.webp',
			duration: '34:18'
		},
		{
			title: 'Behind the booth — Top 8 of NE',
			meta: '21 min · AGE Studios · NE Open',
			image: 'https://www.age.events/banner/studios-banner.webp',
			duration: '21:42'
		}
	];

	const ARTICLES = [
		{
			title: 'They Reminisce Over You',
			author: 'Wesley Dong',
			read: '31 min read',
			premium: true
		},
		{
			title: "Sideboarding for the Calling — what's changing in 2026",
			author: 'Marco Marcelli',
			read: '12 min read',
			premium: false
		},
		{
			title: 'The case for slow Briar in Classic Constructed',
			author: 'Justin Liwag',
			read: '18 min read',
			premium: true
		},
		{
			title: 'Counting cards: tempo math that actually matters',
			author: 'AGE Studios',
			read: '9 min read',
			premium: false
		}
	];

	// progress-ring math for the Continue Learning card — computed
	// once since CURRENT is static placeholder data
	const RING_R = 24;
	const RING_C = 2 * Math.PI * RING_R;
	const RING_OFFSET = RING_C * (1 - CURRENT.progress / 100);
</script>

<svelte:head>
	<title>Academy — AGE</title>
	<meta
		name="description"
		content="A structured course platform built with the players who define the format. Buy a course once and it's yours for life — Premium members get every author update."
	/>
</svelte:head>

<AgeShell active="Academy">
	<!-- ============ HERO + CONTINUE LEARNING ============ -->
	<section class="border-ink border-b-[3px] border-double">
		<div
			class="mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-10 px-14 pt-[50px] pb-[52px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-12"
		>
			<!-- left: copy + stats -->
			<div>
				<div class="mb-4 inline-flex items-center gap-[10px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase before:block before:h-[2px] before:w-[22px] before:content-['']" style="color: #C8922E;">
					<span class="block h-[2px] w-[22px]" style="background-color: #C8922E;"></span>
					AGE Academy
				</div>
				<h1 class="font-newsreader text-[clamp(46px,5.5vw,62px)] leading-[0.96] font-semibold tracking-[-0.02em]">
					Master the game, one
					<em class="text-[#C8922E] italic font-medium">lesson</em>
					at a time.
				</h1>
				<p class="text-soft mt-5 max-w-[500px] text-[18px] leading-[1.6]">
					A structured course platform built with the players who define the format. Buy a course
					once and it's yours for life — Premium members get the author's regular updates as the
					game evolves.
				</p>
				<div class="mt-7 flex flex-wrap gap-3">
					<a
						href="#catalog"
						class="inline-flex items-center gap-2 border-[1.5px] px-5 py-[13px] text-[12px] font-bold tracking-[0.05em] text-white uppercase transition-[filter] hover:brightness-110"
						style="background-color: #C8922E; border-color: #C8922E;"
					>
						Start learning — free
					</a>
					<a
						href="#catalog"
						class="border-ink text-ink hover:bg-ink hover:text-paper-bg inline-flex items-center gap-2 border-[1.5px] bg-transparent px-5 py-[13px] text-[12px] font-bold tracking-[0.05em] uppercase transition-colors"
					>
						Browse catalog
					</a>
				</div>
				<div class="border-line2 mt-[34px] flex flex-wrap gap-x-8 gap-y-4 border-t pt-[18px]">
					{#each STATS as st, i (st.l)}
						<div class="border-line2 {i === STATS.length - 1 ? '' : 'border-r'} pr-8">
							<div class="font-newsreader text-[38px] leading-[0.85] font-semibold tabular-nums">
								{st.n}
							</div>
							<div class="text-fade mt-2 text-[11px] font-extrabold tracking-[0.1em] uppercase">
								{st.l}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- right: Continue Learning card -->
			<aside
				class="bg-paper p-[26px]"
				style="border: 1px solid var(--ed-line2); border-top: 3px solid #C8922E;"
			>
				<div class="text-fade mb-4 text-[10.5px] font-extrabold tracking-[0.16em] uppercase">
					Continue learning
				</div>

				<!-- course header -->
				<div class="mb-5 flex items-center gap-4">
					<div
						class="border-line2 bg-panel h-[76px] w-[104px] flex-shrink-0 border bg-cover bg-center"
						style="background-image: url('{CURRENT.coverImage}');"
					></div>
					<div class="min-w-0 flex-1">
						<div class="text-[10px] font-extrabold tracking-[0.08em] uppercase" style="color: #C8922E;">
							{CURRENT.level}
						</div>
						<h3 class="font-newsreader text-[23px] leading-[1.05] font-semibold tracking-[-0.01em] mt-[5px]">
							{CURRENT.title}
						</h3>
						<div class="text-fade mt-[5px] text-[12px] font-bold">
							Lesson 3 of {CURRENT.lessons}
						</div>
					</div>
					<!-- progress ring -->
					<svg width="56" height="56" viewBox="0 0 56 56" class="flex-shrink-0">
						<circle
							cx="28"
							cy="28"
							r="24"
							fill="none"
							stroke="rgba(146,139,121,0.3)"
							stroke-width="6"
						/>
						<circle
							cx="28"
							cy="28"
							r="24"
							fill="none"
							stroke="#C8922E"
							stroke-width="6"
							stroke-linecap="round"
							stroke-dasharray={RING_C}
							stroke-dashoffset={RING_OFFSET}
							transform="rotate(-90 28 28)"
						/>
						<text
							x="50%"
							y="53%"
							dominant-baseline="middle"
							text-anchor="middle"
							class="text-ink font-libre"
							style="font-size: 13px; font-weight: 800; fill: currentColor;"
						>
							{CURRENT.progress}%
						</text>
					</svg>
				</div>

				<!-- syllabus -->
				<div>
					{#each CURRENT.syllabus as item, i (i)}
						<div
							class="border-line flex items-center gap-3 border-t py-[11px] text-[14px] {item.done
								? ''
								: item.now
									? 'font-extrabold'
									: 'font-semibold'} {i === 0 ? '!border-t border-[#C7BFA9]' : ''}"
							style={item.now ? 'color: #C8922E;' : ''}
						>
							<span
								class="flex h-[21px] w-[21px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] font-extrabold"
								style={item.done
									? 'background-color: var(--ed-prem); border-color: var(--ed-prem); color: white;'
									: item.now
										? 'border-color: #C8922E; color: #C8922E;'
										: 'border-color: var(--ed-line2); color: var(--ed-fade);'}
							>
								{item.done ? '✓' : item.now ? '▶' : i + 1}
							</span>
							<span>{item.title}</span>
							<span class="text-fade ml-auto text-[12px] font-bold">{item.time}</span>
						</div>
					{/each}
				</div>

				<a
					href="#catalog"
					class="mt-5 inline-flex w-full items-center justify-center gap-2 border-[1.5px] px-5 py-[12px] text-[12px] font-bold tracking-[0.05em] text-white uppercase transition-[filter] hover:brightness-110"
					style="background-color: #C8922E; border-color: #C8922E;"
				>
					Resume lesson →
				</a>
			</aside>
		</div>
	</section>

	<!-- ============ TRACKS ============ -->
	<section class="border-ink border-b-[3px] border-double">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[46px] pb-[22px]">
			<div class="flex flex-wrap items-end justify-between gap-5">
				<div>
					<div class="mb-[9px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase" style="color: #C8922E;">
						Guided paths
					</div>
					<h2 class="font-newsreader text-[38px] font-semibold leading-none tracking-[-0.02em]">
						Learning tracks
					</h2>
					<p class="text-soft mt-2 max-w-[520px] text-[14px] leading-[1.5]">
						Sequenced courses that take you from one milestone to the next.
					</p>
				</div>
				<a href="#catalog" class="text-[11px] font-extrabold tracking-[0.07em] whitespace-nowrap uppercase" style="color: #C8922E;">
					All tracks →
				</a>
			</div>
		</div>

		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[46px]">
			<div class="border-line2 grid grid-cols-1 gap-[1px] border bg-[#C7BFA9] md:grid-cols-3">
				{#each TRACKS as track, i (track.title)}
					<a
						href="#catalog"
						class="bg-paper-bg hover:bg-paper group flex min-h-[180px] flex-col px-7 py-7 transition-colors"
						style="border-top: 4px solid {track.color};"
					>
						<div
							class="font-archivo text-[30px] leading-[0.8] font-black tracking-[-0.02em] tabular-nums"
							style="color: {track.color};"
						>
							{String(i + 1).padStart(2, '0')}
						</div>
						<h3 class="font-newsreader mt-4 mb-[9px] text-[24px] font-semibold leading-[1.1]">
							{track.title}
						</h3>
						<p class="text-soft m-0 mb-auto max-w-[280px] text-[13.5px] leading-[1.5]">
							{track.body}
						</p>
						<div
							class="mt-5 text-[11px] font-extrabold tracking-[0.06em] uppercase"
							style="color: {track.color};"
						>
							{track.courses} courses →
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>

	<!-- ============ CATALOG ============ -->
	<section id="catalog" class="border-ink border-b-[3px] border-double">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[46px] pb-[22px]">
			<div class="flex flex-wrap items-end justify-between gap-5">
				<div>
					<div class="mb-[9px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase" style="color: #C8922E;">
						Course catalog
					</div>
					<h2 class="font-newsreader text-[38px] font-semibold leading-none tracking-[-0.02em]">
						Start anywhere
					</h2>
					<p class="text-soft mt-2 max-w-[520px] text-[14px] leading-[1.5]">
						Free and paid courses across every skill level — buy once, own for life, and your
						progress is saved as you go.
					</p>
				</div>
				<a href="#catalog" class="text-[11px] font-extrabold tracking-[0.07em] whitespace-nowrap uppercase" style="color: #C8922E;">
					Filter &amp; browse →
				</a>
			</div>
		</div>

		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[46px]">
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each COURSES as c (c.title)}
					<a
						href="#catalog"
						class="border-line2 bg-paper-bg group hover:border-ink flex flex-col border transition-colors"
					>
						<div
							class="border-line2 relative h-[150px] border-b bg-cover bg-center"
							style="background-image: url('{c.image}');"
						>
							<span class="bg-paper-bg text-ink absolute top-[11px] left-[11px] px-[9px] py-[4px] text-[9.5px] font-extrabold tracking-[0.07em] uppercase">
								{c.level}
							</span>
							{#if c.free}
								<span
									class="bg-prem absolute top-[11px] right-[11px] px-[9px] py-[4px] text-[9.5px] font-extrabold tracking-[0.05em] text-white uppercase"
								>
									Free
								</span>
							{/if}
						</div>
						<div class="flex flex-1 flex-col px-5 py-[20px]">
							<h4 class="font-newsreader group-hover:text-[#C8922E] text-[21px] leading-[1.06] font-semibold transition-colors mb-2">
								{c.title}
							</h4>
							<div class="text-fade mb-[14px] flex gap-2 text-[12px] font-bold">
								<span>{c.lessons} lessons · {c.minutes} min</span>
								<span style="color: #C8922E;">★ {c.rating}</span>
							</div>
							<div class="bg-line mt-auto h-[5px] overflow-hidden">
								<span
									class="block h-full"
									style="width: {c.progress}%; background-color: #C8922E;"
								></span>
							</div>
							<div class="text-soft mt-[10px] flex items-center justify-between text-[11px] font-extrabold tracking-[0.04em] uppercase">
								<span>
									{c.progress === 100
										? 'Completed'
										: c.progress > 0
											? `${c.progress}% complete`
											: `${c.students.toLocaleString()} enrolled`}
								</span>
								<span style="color: #C8922E;">
									{c.free ? 'Free' : `$${c.price}`}
								</span>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>

	<!--
		WATCH + READ — the two-column split now sits inside the same
		`max-w-[1600px]` cap as the hero and the rest of the
		sections, so the columns line up with the page's content gutter
		on wide screens instead of stretching to the viewport edges.
	-->
	<section class="border-ink border-b-[3px] border-double">
		<div
			class="mx-auto grid w-full max-w-[1600px] grid-cols-1 px-14 lg:grid-cols-2"
		>
			<!-- watch -->
			<div class="border-line2 py-[40px] lg:border-r lg:pr-12">
			<div class="mb-6 flex items-baseline justify-between">
				<h3 class="font-newsreader text-[26px] font-semibold tracking-[-0.01em]">
					Watch to learn
				</h3>
				<a href="/studios" class="text-[11px] font-extrabold tracking-[0.06em] uppercase" style="color: #C8922E;">
					AGE Studios →
				</a>
			</div>
			{#each VODS as v, i (v.title)}
				<a
					href="/studios"
					class="border-line group flex items-center gap-[15px] border-t py-[14px] first:border-t-0 first:pt-0"
				>
					<div
						class="border-line2 bg-panel relative h-[72px] w-[124px] flex-shrink-0 border bg-cover bg-center"
						style="background-image: url('{v.image}');"
					>
						<span
							class="absolute top-1/2 left-1/2 flex h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper-bg/90 text-[11px] text-ink"
							aria-hidden="true"
						>
							▶
						</span>
						<span class="absolute right-[5px] bottom-[5px] bg-black/80 px-[5px] py-[1px] text-[9.5px] font-bold text-white">
							{v.duration}
						</span>
					</div>
					<div>
						<h4 class="font-newsreader text-[17px] leading-[1.12] font-semibold group-hover:text-[#C8922E] transition-colors">
							{v.title}
						</h4>
						<div class="text-fade mt-[5px] text-[11px] font-bold">
							{v.meta}
						</div>
					</div>
				</a>
			{/each}
		</div>

		<!-- read -->
		<div class="py-[40px] lg:pl-12">
			<div class="mb-6 flex items-baseline justify-between">
				<h3 class="font-newsreader text-[26px] font-semibold tracking-[-0.01em]">
					Read to improve
				</h3>
				<a href="/library" class="text-[11px] font-extrabold tracking-[0.06em] uppercase" style="color: #C8922E;">
					All articles →
				</a>
			</div>
			{#each ARTICLES as a, i (a.title)}
				<a
					href="/library"
					class="border-line group grid grid-cols-[1fr_auto] items-start gap-[14px] border-t py-[14px] first:border-t-0 first:pt-0"
				>
					<div>
						<h4 class="font-newsreader text-[18px] leading-[1.1] font-semibold group-hover:text-warm transition-colors">
							{a.title}
						</h4>
						<div class="text-fade mt-[6px] text-[11px] font-bold tracking-[0.04em] uppercase">
							{a.author} · {a.read}
						</div>
					</div>
					<span
						class="text-[9.5px] font-extrabold tracking-[0.07em] uppercase px-[8px] py-[3px]"
						style={a.premium
							? 'background-color: var(--ed-prem); color: white;'
							: 'border: 1px solid var(--ed-line2); color: var(--ed-soft);'}
					>
						{a.premium ? 'Premium' : 'Free'}
					</span>
				</a>
			{/each}
		</div>
		</div>
	</section>

	<!-- ============ PLEDGE BAND ============ -->
	<section class="px-14 py-[44px]">
		<div class="mx-auto w-full max-w-[1600px]">
			<div
				class="bg-ink text-paper-bg relative flex flex-wrap items-center justify-between gap-11 overflow-hidden px-14 py-[52px]"
			>
				<!-- gold ring ornament -->
				<div
					class="pointer-events-none absolute -top-[90px] -right-[90px] h-[300px] w-[300px] rounded-full"
					style="border: 42px solid rgba(200, 146, 46, 0.16);"
					aria-hidden="true"
				></div>

				<div class="relative z-[1] max-w-[680px]">
					<div class="mb-3 text-[10.5px] font-extrabold tracking-[0.18em] uppercase" style="color: #F4C66A;">
						Premium · Always up to date
					</div>
					<h2 class="font-newsreader text-[40px] leading-[1.05] font-semibold tracking-[-0.01em] text-white">
						Your courses, kept
						<em class="font-medium italic" style="color: #F4C66A;">current</em>
						— for as long as you play.
					</h2>
					<p class="mt-[14px] max-w-[560px] text-[14.5px] leading-[1.55]" style="color: #C7BFA9;">
						Every course is yours to keep the day you buy it. Premium members get the authors'
						regular updates on top — new lines, fresh matchups, and meta calls added as the
						format moves, at no extra cost.
					</p>
				</div>

				<a
					href="/premium"
					class="relative z-[1] inline-flex flex-shrink-0 items-center gap-2 border-[1.5px] px-7 py-[14px] text-[13px] font-bold tracking-[0.05em] uppercase transition-[filter] hover:brightness-110"
					style="background-color: #C8922E; border-color: #C8922E; color: white;"
				>
					Become a member →
				</a>
			</div>
		</div>
	</section>
</AgeShell>
