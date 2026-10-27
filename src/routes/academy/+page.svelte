<script>
	/**
	 * Academy index — the course catalogue in the Academy's own register
	 * (board-green masthead, gold accents, paper cards). Search and the
	 * filters run in the browser over the full published list; the state
	 * mirrors into the URL so a filtered view can be shared.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import CourseCard from '$lib/components/age/academy/CourseCard.svelte';
	import { replaceState } from '$app/navigation';
	import { onMount } from 'svelte';
	import CourseCover from '$lib/components/age/academy/CourseCover.svelte';
	import FilterSelect from '$lib/components/age/FilterSelect.svelte';
	import { toCard, lengthBand, formatMinutes, formatPrice } from '$lib/academy/format.js';

	let { data } = $props();

	const member = $derived(data.isPremiumMember ?? false);
	const courses = $derived((data.courses ?? []).map(toCard));
	const progress = $derived(data.progress ?? {});
	const previews = $derived(data.previews ?? []);

	// ============ featured: the newest course ============
	const featured = $derived(
		[...courses].sort(
			(a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
		)[0] ?? null
	);
	const featuredMeta = $derived(
		featured
			? [featured.lessons ? `${featured.lessons} lessons` : '', formatMinutes(featured.minutes)]
					.filter(Boolean)
					.join(' · ')
			: ''
	);
	const featuredTicks = $derived(Array.from({ length: Math.min(featured?.lessons || 0, 24) }));
	const featuredFree = $derived(
		featured ? previews.filter((l) => l.courseSlug === featured.slug).slice(0, 3) : []
	);
	const featuredAdded = $derived(
		featured?.publishedAt
			? new Date(featured.publishedAt).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})
			: ''
	);

	// ============ continue learning ============
	const inProgress = $derived(
		courses
			.filter((c) => progress[c.slug])
			.map((c) => ({
				card: c,
				p: { completed: progress[c.slug].completed, total: c.lessons },
				lastAt: progress[c.slug].lastAt,
				lastLesson: progress[c.slug].lastLessonTitle
			}))
			.sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime())
			.slice(0, 3)
	);

	// ============ filters ============
	const PRICE = [
		{ v: 'all', l: 'All' },
		{ v: 'free', l: 'Free' },
		{ v: 'paid', l: 'Paid' }
	];
	const LENGTH = [
		{ v: 'all', l: 'Any length' },
		{ v: 'short', l: 'Under 1 hour' },
		{ v: 'medium', l: '1 – 3 hours' },
		{ v: 'long', l: 'Over 3 hours' }
	];
	const SORT = [
		{ v: 'newest', l: 'Newest' },
		{ v: 'az', l: 'A – Z' },
		{ v: 'price-asc', l: 'Price: low to high' },
		{ v: 'price-desc', l: 'Price: high to low' },
		{ v: 'longest', l: 'Longest first' },
		{ v: 'shortest', l: 'Shortest first' }
	];

	let q = $state('');
	let price = $state('all');
	let who = $state('');
	let len = $state('all');
	let sort = $state('newest');

	const instructors = $derived.by(() => {
		/** @type {Map<string, number>} */
		const m = new Map();
		for (const c of courses) m.set(c.instructor, (m.get(c.instructor) || 0) + 1);
		return [...m.entries()]
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
	});
	const instructorOptions = $derived([
		{ v: '', l: 'Anyone' },
		...instructors.map((i) => ({ v: i.name, l: i.name }))
	]);

	const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	const filtered = $derived.by(() => {
		const terms = norm(q).split(/\s+/).filter(Boolean);
		return courses.filter((c) => {
			if (price === 'free' && c.price > 0) return false;
			if (price === 'paid' && !(c.price > 0)) return false;
			if (who && c.instructor !== who) return false;
			if (len !== 'all' && lengthBand(c.minutes) !== len) return false;
			if (terms.length) {
				const hay = norm(`${c.title} ${c.dek} ${c.instructor}`);
				if (!terms.every((t) => hay.includes(t))) return false;
			}
			return true;
		});
	});
	const sorted = $derived.by(() => {
		const list = [...filtered];
		const t = (c) => new Date(c.publishedAt || 0).getTime();
		switch (sort) {
			case 'az':
				return list.sort((a, b) => a.title.localeCompare(b.title));
			case 'price-asc':
				return list.sort((a, b) => a.price - b.price || t(b) - t(a));
			case 'price-desc':
				return list.sort((a, b) => b.price - a.price || t(b) - t(a));
			case 'longest':
				return list.sort((a, b) => b.minutes - a.minutes);
			case 'shortest':
				return list.sort((a, b) => a.minutes - b.minutes);
			default:
				return list.sort((a, b) => t(b) - t(a));
		}
	});
	const activeCount = $derived(
		(q ? 1 : 0) + (price !== 'all' ? 1 : 0) + (who ? 1 : 0) + (len !== 'all' ? 1 : 0)
	);
	const resultLine = $derived.by(() => {
		const noun = courses.length === 1 ? 'course' : 'courses';
		if (sorted.length === courses.length) return `${courses.length} ${noun}.`;
		return `${sorted.length} of ${courses.length} ${noun}${q ? ` matching “${q}”` : ''}.`;
	});
	function clearAll() {
		q = '';
		price = 'all';
		who = '';
		len = 'all';
		sort = 'newest';
	}

	// ============ URL sync ============
	// Read the filters from the URL once on mount, then mirror every
	// change back with replaceState so the view can be shared and the
	// back button is not polluted.
	let ready = $state(false);
	onMount(() => {
		const sp = new URLSearchParams(window.location.search);
		q = sp.get('q') || '';
		if (PRICE.some((o) => o.v === sp.get('price'))) price = /** @type {string} */ (sp.get('price'));
		who = sp.get('who') || '';
		if (LENGTH.some((o) => o.v === sp.get('len'))) len = /** @type {string} */ (sp.get('len'));
		if (SORT.some((o) => o.v === sp.get('sort'))) sort = /** @type {string} */ (sp.get('sort'));
		ready = true;
	});
	$effect(() => {
		if (!ready) return;
		const sp = new URLSearchParams();
		if (q) sp.set('q', q);
		if (price !== 'all') sp.set('price', price);
		if (who) sp.set('who', who);
		if (len !== 'all') sp.set('len', len);
		if (sort !== 'newest') sp.set('sort', sort);
		// Compare as sorted pairs so a hand-typed order of parameters is not
		// "different"; and never let a too-early replaceState break hydration.
		const canon = (x) =>
			[...new URLSearchParams(x).entries()]
				.sort()
				.map(([k, v]) => `${k}=${v}`)
				.join('&');
		if (canon(window.location.search) !== canon(sp)) {
			const next = sp.toString() ? `?${sp}` : '';
			try {
				replaceState(`${window.location.pathname}${next}${window.location.hash}`, {});
			} catch {
				/* router not ready yet; the next change will sync */
			}
		}
	});

	/** @type {HTMLElement | undefined} */
	let catalogueEl = $state();
	function jumpToCatalogue() {
		catalogueEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>Academy — AGE</title>
	<meta
		name="description"
		content="Full written courses from the players who define the format. Buy once, keep for life. Premium members get every course update free."
	/>
</svelte:head>

<AgeShell active="Academy">
	<!-- ============ masthead ============ -->
	<section class="relative bg-academy text-paper-bg">
		<div
			class="pointer-events-none absolute inset-x-0 top-0 h-40"
			style="background: linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0));"
			aria-hidden="true"
		></div>
		<div class="relative mx-auto w-full max-w-[1200px] px-5 pt-12 pb-12 md:px-8 md:pt-16 md:pb-20">
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
			<div class="mx-auto mt-6 max-w-[820px] text-center">
				<h1
					class="fp-rise font-newsreader text-[40px] leading-[0.98] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[64px]"
				>
					Learn the game from the players who define it.
				</h1>
				<p
					class="fp-rise mx-auto mt-4 max-w-[640px] font-newsreader text-[16px] leading-[1.45] text-paper-bg/70 italic md:mt-5 md:text-[19px]"
					style="animation-delay: 120ms;"
				>
					Full courses on decision-making, sideboarding and tempo, written by the pros and broken
					into short lessons. Buy once, keep for life.
				</p>
			</div>

			<!-- featured: the newest course as a spread on the band -->
			{#if featured}
				<article
					class="mt-10 grid gap-8 border-t border-gold/40 pt-8 md:mt-14 md:pt-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14"
					aria-label="Newest course: {featured.title}"
				>
					<!-- cover in a gold plate -->
					<a href={featured.href} class="group relative block lg:order-2">
						<span
							class="pointer-events-none absolute inset-0 translate-x-3 translate-y-3 border border-gold/70 transition-transform duration-1000 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-2.5 group-hover:translate-y-2.5"
							aria-hidden="true"
						></span>
						<CourseCover image={featured.image} slug={featured.slug} class="relative z-[1]">
							<span
								class="absolute top-0 left-0 bg-gold px-3 py-1.5 text-[9.5px] font-extrabold tracking-[0.18em] text-[#241b07] uppercase"
								>Newest course</span
							>
							{#if featuredAdded}
								<span
									class="absolute right-0 bottom-0 bg-paper-bg px-3 py-1.5 text-[9px] font-extrabold tracking-[0.16em] text-ink uppercase"
									>Added {featuredAdded}</span
								>
							{/if}
						</CourseCover>
					</a>

					<!-- copy -->
					<div class="lg:order-1">
						<p
							class="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[0.22em] text-gold uppercase md:text-[10.5px]"
						>
							<span aria-hidden="true">◆</span> With {featured.instructor}
						</p>
						<h2
							class="mt-3 font-newsreader text-[32px] leading-[1.02] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[44px]"
						>
							<a href={featured.href} class="fp-ul">{featured.title}</a>
						</h2>
						{#if featured.dek}
							<p
								class="mt-4 line-clamp-4 font-newsreader text-[16px] leading-[1.5] text-paper-bg/75 italic md:text-[17.5px]"
							>
								{featured.dek}
							</p>
						{/if}

						<div class="mt-6 flex items-center gap-3 text-[10.5px] font-semibold text-paper-bg/70">
							{#if featuredTicks.length}
								<span class="flex items-end gap-[3px]" aria-hidden="true">
									{#each featuredTicks as _, i (i)}
										<span class="block h-[8px] w-[3px] bg-gold"></span>
									{/each}
								</span>
							{/if}
							{#if featuredMeta}<span>{featuredMeta}</span>{/if}
						</div>

						{#if featuredFree.length}
							<div class="mt-6 border-t border-paper-bg/15 pt-4">
								<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-gold uppercase">
									Free to read
								</p>
								<ol class="mt-2">
									{#each featuredFree as l, i (l.id)}
										<li class="flex items-baseline gap-3 py-1.5 text-paper-bg">
											<span class="w-6 shrink-0 font-newsreader text-[15px] text-gold tabular-nums"
												>{String(i + 1).padStart(2, '0')}</span
											>
											<span class="font-newsreader text-[16.5px] leading-tight font-semibold">
												{l.title}
											</span>
											<span
												class="ml-auto shrink-0 text-[10px] font-semibold text-paper-bg/55 tabular-nums"
												>{l.minutes} min</span
											>
										</li>
									{/each}
								</ol>
							</div>
						{/if}

						<div
							class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-paper-bg/15 pt-6"
						>
							<span class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
								<span
									class="font-newsreader text-[32px] leading-none font-semibold text-gold tabular-nums"
									>{formatPrice(featured.price)}</span
								>
								{#if featured.price > 0}
									<span
										class="text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap text-paper-bg/60 uppercase"
										>One-time purchase</span
									>
								{/if}
							</span>
							<span class="flex items-center gap-5">
								<a
									href={featured.href}
									class="inline-flex items-center bg-gold px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap text-[#241b07] uppercase transition-[filter] hover:brightness-110"
								>
									{featured.price > 0 ? 'Enroll' : 'Start free'} →
								</a>
								<a
									href="{featured.href}#syllabus"
									class="border-b border-paper-bg/40 pb-0.5 text-[10px] font-extrabold tracking-[0.16em] whitespace-nowrap text-paper-bg/80 uppercase transition-colors hover:border-gold hover:text-gold"
								>
									See the syllabus
								</a>
							</span>
						</div>
					</div>
				</article>
			{/if}
		</div>
	</section>

	<!-- ============ continue learning ============ -->
	{#if inProgress.length}
		<section class="border-b border-line bg-paper">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-12">
				<div class="flex items-baseline justify-between gap-4">
					<h2
						class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
					>
						<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
						Continue learning
					</h2>
					<span class="font-newsreader text-[15px] text-soft italic"
						>Pick up where you left off.</span
					>
				</div>
				<ul class="mt-5 grid gap-5 md:grid-cols-3">
					{#each inProgress as item (item.card.slug)}
						<li>
							<CourseCard course={item.card} progress={item.p} compact />
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	<!-- ============ catalogue ============ -->
	<section id="courses" bind:this={catalogueEl} class="scroll-mt-20">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
			<div class="flex items-center gap-4 md:gap-6">
				<span class="h-px flex-1 bg-ink"></span>
				<h2
					class="font-newsreader text-[17px] font-semibold tracking-[0.22em] whitespace-nowrap uppercase md:text-[20px]"
				>
					All courses
				</h2>
				<span class="h-px flex-1 bg-ink"></span>
			</div>
			<div class="mt-2 flex justify-center" aria-hidden="true">
				<span class="h-[3px] w-10 bg-gold"></span>
			</div>

			<!-- filter bar -->
			<div
				class="mt-7 flex flex-col gap-5 border-y border-line py-5 md:mt-9 md:flex-row md:flex-wrap md:items-center md:gap-x-8 md:gap-y-3 md:py-4"
			>
				<label
					class="relative flex items-center gap-2.5 border border-line2 bg-paper-bg px-3.5 py-2.5 md:w-[280px] md:border-0 md:bg-transparent md:p-0"
				>
					<svg
						class="h-3.5 w-3.5 shrink-0 text-gold"
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						aria-hidden="true"
					>
						<circle cx="8.5" cy="8.5" r="5.5" />
						<path d="M13 13l4.5 4.5" stroke-linecap="square" />
					</svg>
					<span class="sr-only">Search courses</span>
					<input
						type="search"
						name="q"
						bind:value={q}
						placeholder="Search courses, instructors"
						autocomplete="off"
						class="w-full border-0 bg-transparent p-0 font-newsreader text-[16px] leading-tight text-ink placeholder:text-fade focus:outline-none md:border-b md:border-line2 md:py-1 md:focus:border-gold"
					/>
				</label>
				<div
					class="grid grid-cols-3 border border-line2 text-[10px] font-extrabold tracking-[0.16em] uppercase md:flex md:items-center md:gap-5 md:border-0 md:text-[10.5px]"
					role="group"
					aria-label="Price"
				>
					{#each PRICE as o (o.v)}
						<button
							type="button"
							onclick={() => (price = o.v)}
							aria-pressed={price === o.v}
							class="fp-ul border-l border-line2 py-2.5 text-center transition-colors first-of-type:border-l-0 md:border-0 md:py-0 md:pb-0.5 md:hover:text-gold {price ===
							o.v
								? 'bg-ink text-paper-bg md:bg-transparent md:[background-size:100%_1.5px] md:text-ink'
								: 'text-fade'}">{o.l}</button
						>
					{/each}
				</div>
				<div
					class="grid grid-cols-2 gap-x-5 gap-y-4 md:flex md:flex-wrap md:items-center md:gap-x-6 md:gap-y-3"
				>
					<FilterSelect
						label="Instructor"
						bind:value={who}
						options={instructorOptions}
						accent="focus-within:border-gold"
					/>
					<FilterSelect
						label="Length"
						bind:value={len}
						options={LENGTH}
						accent="focus-within:border-gold"
					/>
				</div>
				<div class="grid grid-cols-2 items-end gap-x-5 md:ml-auto md:flex md:items-center md:gap-6">
					<FilterSelect
						label="Sort"
						bind:value={sort}
						options={SORT}
						accent="focus-within:border-gold"
					/>
					{#if activeCount}
						<button
							type="button"
							onclick={clearAll}
							class="justify-self-end pb-2 text-[10px] font-extrabold tracking-[0.16em] text-gold uppercase transition-[letter-spacing] hover:tracking-[0.22em] md:pb-0"
							>Clear ×</button
						>
					{/if}
				</div>
			</div>

			<p class="mt-4 font-newsreader text-[15px] text-soft italic" aria-live="polite">
				{resultLine}
			</p>

			{#if sorted.length}
				<ul class="mt-6 grid gap-6 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
					{#each sorted as c (c.slug)}
						<li>
							<CourseCard
								course={c}
								showDek
								progress={progress[c.slug]
									? { completed: progress[c.slug].completed, total: c.lessons }
									: null}
							/>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="mt-8 border-[3px] border-double border-ink px-6 py-12 text-center">
					<p class="font-newsreader text-[24px] font-semibold">Nothing matches that yet.</p>
					<p class="mt-2 font-newsreader text-[16px] text-soft italic">
						Try a shorter search, or clear the filters to see every course.
					</p>
					<button
						type="button"
						onclick={clearAll}
						class="mt-5 inline-flex items-center bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
						>Show all courses</button
					>
				</div>
			{/if}
		</div>
	</section>

	<!-- ============ free previews + instructors ============ -->
	{#if previews.length || instructors.length}
		<section class="border-y border-line bg-paper">
			<div
				class="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-10 md:px-8 md:py-14 lg:grid-cols-[1.4fr_1fr] lg:gap-16"
			>
				{#if previews.length}
					<div>
						<h2
							class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
						>
							<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
							Read free
						</h2>
						<p class="mt-2 font-newsreader text-[15px] text-soft italic md:text-[16px]">
							Every course opens a lesson or two to everyone. Start here.
						</p>
						<ol class="mt-4 border-t border-line">
							{#each previews as l (l.id)}
								<li class="border-b border-line">
									<a
										href="/academy/{l.courseSlug}#syllabus"
										class="group grid grid-cols-[28px_1fr_auto] items-center gap-3 py-3.5"
									>
										<span
											class="flex h-7 w-7 items-center justify-center bg-ink text-[9px] text-paper-bg transition-colors group-hover:bg-gold group-hover:text-[#241b07]"
											aria-hidden="true">{l.hasVideo ? '▶' : '¶'}</span
										>
										<span class="min-w-0">
											<span class="block font-newsreader text-[17px] leading-[1.2] font-semibold">
												<span class="fp-ul">{l.title}</span>
											</span>
											<span class="mt-1 block truncate text-[10.5px] text-fade">
												<span class="font-extrabold tracking-[0.1em] text-ink uppercase"
													>{l.courseTitle}</span
												>{#if l.instructor}<span class="font-semibold"> · {l.instructor}</span>{/if}
											</span>
										</span>
										<span
											class="font-newsreader text-[15px] whitespace-nowrap text-gold tabular-nums"
											>{l.minutes} min</span
										>
									</a>
								</li>
							{/each}
						</ol>
					</div>
				{/if}
				{#if instructors.length}
					<div>
						<h2
							class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
						>
							<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
							Instructors
						</h2>
						<p class="mt-2 font-newsreader text-[15px] text-soft italic md:text-[16px]">
							Every course is taught by a player who has done it at the top tables.
						</p>
						<ul class="mt-4 border-t border-line">
							{#each instructors as i (i.name)}
								<li class="border-b border-line">
									<button
										type="button"
										onclick={() => {
											who = who === i.name ? '' : i.name;
											jumpToCatalogue();
										}}
										aria-pressed={who === i.name}
										class="group flex w-full items-center justify-between gap-4 py-3.5 text-left"
									>
										<span class="flex items-center gap-3">
											<span
												class="flex h-8 w-8 items-center justify-center bg-ink font-newsreader text-[13px] font-semibold text-paper-bg transition-colors group-hover:bg-gold group-hover:text-[#241b07]"
												aria-hidden="true"
											>
												{i.name
													.split(/\s+/)
													.map((w) => w.charAt(0))
													.slice(0, 2)
													.join('')
													.toUpperCase()}
											</span>
											<span class="font-newsreader text-[17px] font-semibold">
												<span class="fp-ul">{i.name}</span>
											</span>
										</span>
										<span class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
											>{i.count} {i.count === 1 ? 'course' : 'courses'} →</span
										>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- ============ how it works + premium ============ -->
	<section class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
		<div class="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
			<div>
				<h2
					class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
				>
					<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
					How the Academy works
				</h2>
				<ol class="mt-4 border-t border-line">
					{#each [['Buy once, keep for life', 'Pay once and the course is yours. No subscription needed to read it.'], ['Lessons, not lectures', 'Short written lessons with drills and self-checks, so each sitting has a point.'], ['Updates free with Premium', 'When an instructor revises a course or adds lessons, Premium members get the new material at no charge.'], ['Free previews', 'Every course opens at least one lesson to everyone before you pay.']] as [t, b], i (t)}
						<li class="grid grid-cols-[36px_1fr] gap-3 border-b border-line py-4">
							<span
								class="font-newsreader text-[22px] leading-none font-semibold text-gold tabular-nums"
								>{String(i + 1).padStart(2, '0')}</span
							>
							<span>
								<span class="block font-newsreader text-[18px] leading-tight font-semibold"
									>{t}</span
								>
								<span class="mt-1 block font-newsreader text-[15px] leading-[1.45] text-soft italic"
									>{b}</span
								>
							</span>
						</li>
					{/each}
				</ol>
			</div>
			{#if !member}
				<div class="border-[3px] border-double border-ink bg-paper px-6 py-8 md:px-10 md:py-10">
					<div class="text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase">
						<span aria-hidden="true">◆</span> Premium
					</div>
					<p
						class="mt-3 font-newsreader text-[28px] leading-[1.05] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[34px]"
					>
						Your courses stay current with Premium.
					</p>
					<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft italic">
						Courses are a one-time purchase. When an instructor revises one you own or adds new
						lessons, AGE Premium members receive every update free, on top of every article, all
						gameplay and the Library.
					</p>
					<a
						href="/premium"
						class="mt-6 inline-flex items-center gap-2 border-[1.5px] border-prem bg-prem px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
					>
						<span class="text-[8px] opacity-80" aria-hidden="true">◆</span>
						Get Premium
					</a>
				</div>
			{:else}
				<div class="border-[3px] border-double border-ink bg-paper px-6 py-8 md:px-10 md:py-10">
					<div class="text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase">
						<span aria-hidden="true">◆</span> Premium member
					</div>
					<p
						class="mt-3 font-newsreader text-[28px] leading-[1.05] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[34px]"
					>
						Your courses stay current.
					</p>
					<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft italic">
						As a member, every update an instructor publishes to a course you own is included.
					</p>
				</div>
			{/if}
		</div>
	</section>
</AgeShell>
