<script>
	/**
	 * Library → Bonus gameplay. Every feature match AGE Studios has filmed,
	 * in the Library's register: an ink masthead, the newest match as a
	 * full-width spread, a hairline filter bar (search, hero, event, sort),
	 * the matches as Library cards, and the Premium note for non-members.
	 * Filters live in the URL, so a view can be shared and paged server-side.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import FrontByline from '$lib/components/age/home/FrontByline.svelte';
	import FilterSelect from '$lib/components/age/FilterSelect.svelte';
	import { formatDate, formatDuration } from '$lib/components/age/home/front-adapters.js';
	import { reveal } from '$lib/actions/reveal.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const vods = $derived(data.vods || []);
	const pagination = $derived(data.pagination || { page: 1, totalPages: 0, total: 0 });
	const filters = $derived(data.filters || { q: '', event: '', hero: '', sort: 'newest' });
	const events = $derived(data.events || []);
	const member = $derived($page.data?.isPremiumMember ?? false);
	const activeCount = $derived([filters.q, filters.event, filters.hero].filter(Boolean).length);

	// ============ cards ============
	const eventsById = $derived(Object.fromEntries(events.map((e) => [e.id, e])));
	const muxStill = (v, w) => {
		if (!v.muxPlaybackId) return 'https://www.age.events/banner/age-open-banner.webp';
		const h = Math.round((w * 9) / 16);
		const token = v.thumbnailToken ? `&token=${v.thumbnailToken}` : '';
		return `https://image.mux.com/${v.muxPlaybackId}/thumbnail.webp?width=${w}&height=${h}&fit_mode=smartcrop${token}`;
	};
	const films = $derived(
		vods.map((v) => {
			const ev = v.eventId ? eventsById[v.eventId] : null;
			const players = [v.player1Name, v.player2Name].filter(Boolean).join(' vs ');
			const heroes = [v.player1Hero, v.player2Hero].filter(Boolean).join(' vs ');
			const title = v.title || players || 'Untitled match';
			return {
				id: v.id,
				href: `/library/${v.id}`,
				title,
				players,
				// Titles are often the matchup itself; don't print it twice.
				heroes: heroes && heroes !== title ? heroes : '',
				dek: v.description || '',
				picture: v.cover || null,
				still: (w) => muxStill(v, w),
				rubric: ev?.circuit ? `AGE Open · ${ev.circuit}` : ev?.title || 'Bonus match',
				date: formatDate(v.publishedAt),
				length: formatDuration(v.duration),
				premium: !!v.isPremium
			};
		})
	);
	// The newest match leads the first page when nothing is filtered.
	const leadFirst = $derived(pagination.page === 1 && !activeCount && filters.sort === 'newest');
	const lead = $derived(leadFirst ? (films[0] ?? null) : null);
	const grid = $derived(leadFirst ? films.slice(1) : films);

	// ============ filters (all in the URL) ============
	function updateFilters(updates) {
		const url = new URL($page.url);
		for (const [key, value] of Object.entries(updates)) {
			if (value) url.searchParams.set(key, String(value));
			else url.searchParams.delete(key);
		}
		if (!('page' in updates)) url.searchParams.delete('page');
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}
	let searchTimer;
	function onSearch(e) {
		clearTimeout(searchTimer);
		const value = e.currentTarget.value.trim();
		searchTimer = setTimeout(() => updateFilters({ q: value || null }), 300);
	}

	// FilterSelect binds a value; mirror the URL into it and push changes back.
	let hero = $state('');
	let eventId = $state('');
	let sort = $state('newest');
	$effect(() => {
		hero = filters.hero || '';
		eventId = filters.event || '';
		sort = filters.sort || 'newest';
	});
	$effect(() => {
		if (hero !== (filters.hero || '')) updateFilters({ hero: hero || null });
	});
	$effect(() => {
		if (eventId !== (filters.event || '')) updateFilters({ event: eventId || null });
	});
	$effect(() => {
		if (sort !== (filters.sort || 'newest'))
			updateFilters({ sort: sort === 'newest' ? null : sort });
	});

	const eventLabel = (ev) =>
		[ev.circuit || ev.title, ev.eventDate && formatDate(ev.eventDate)].filter(Boolean).join(' · ');
	const heroOptions = $derived([
		{ v: '', l: 'Any' },
		...(data.heroes || []).map((h) => ({ v: h, l: h }))
	]);
	const eventOptions = $derived([
		{ v: '', l: 'Any' },
		...events.map((e) => ({ v: e.id, l: eventLabel(e) }))
	]);
	const SORTS = [
		{ v: 'newest', l: 'Newest' },
		{ v: 'oldest', l: 'Oldest' },
		{ v: 'longest', l: 'Longest' }
	];

	const resultLine = $derived.by(() => {
		const n = pagination.total ?? 0;
		const noun = n === 1 ? 'match' : 'matches';
		const scope = activeCount ? `${n} of ${data.totalVods || 0} matches` : `${n} ${noun}`;
		const where =
			pagination.totalPages > 1 ? `, page ${pagination.page} of ${pagination.totalPages}` : '';
		return `${scope}${filters.q ? ` matching “${filters.q}”` : ''}${where}.`;
	});
	const pageNumbers = $derived.by(() => {
		const total = pagination.totalPages;
		const cur = pagination.page;
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const out = [1];
		if (cur > 3) out.push('…');
		for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) out.push(i);
		if (cur < total - 2) out.push('…');
		out.push(total);
		return out;
	});
	function gotoPage(n) {
		if (n < 1 || n > pagination.totalPages || n === pagination.page) return;
		updateFilters({ page: n });
		requestAnimationFrame(() =>
			document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		);
	}
	function clearAll() {
		goto('/library/vods', { replaceState: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Bonus gameplay — Library — AGE</title>
	<meta
		name="description"
		content="Feature matches from the AGE Open, filmed by AGE Studios. Search by player, or filter by hero and event."
	/>
</svelte:head>

{#snippet play(size = 'md')}
	<span
		class="absolute right-0 bottom-0 z-[2] flex items-center justify-center bg-warm text-white {size ===
		'lg'
			? 'h-10 w-10 pl-[3px] text-[13px]'
			: 'h-7 w-7 pl-[2px] text-[10px]'}"
		aria-hidden="true">▶</span
	>
{/snippet}

<AgeShell active="Library">
	<!-- ============ ink masthead ============ -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-10 md:px-8 md:pt-12 md:pb-14">
			<nav
				class="fp-rise flex items-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-paper-bg/60 uppercase"
				aria-label="Breadcrumb"
			>
				<a href="/library" class="transition-colors hover:text-warm-light">Library</a>
				<span aria-hidden="true">/</span>
				<span>Gameplay</span>
			</nav>
			<div
				class="mt-8 flex flex-col items-start gap-5 md:mt-12 md:flex-row md:items-end md:justify-between md:gap-10"
			>
				<div class="min-w-0">
					<p
						class="fp-rise flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.24em] text-warm-light uppercase"
						style="animation-delay: 80ms;"
					>
						<span class="text-[8px]" aria-hidden="true">◆</span> AGE Studios
					</p>
					<h1
						class="fp-rise mt-3 font-newsreader text-[44px] leading-[0.95] font-semibold tracking-[-0.02em] md:text-[72px]"
						style="animation-delay: 140ms;"
					>
						Bonus gameplay
					</h1>
					<p
						class="fp-rise mt-4 max-w-[560px] font-newsreader text-[17px] leading-[1.45] text-paper-bg/70 italic md:text-[19px]"
						style="animation-delay: 180ms;"
					>
						Feature matches from the AGE Open, filmed on the main stage.
					</p>
				</div>
				<p
					class="fp-rise shrink-0 text-[10px] font-extrabold tracking-[0.22em] text-paper-bg/70 uppercase md:pb-2 md:text-right"
					style="animation-delay: 220ms;"
				>
					{data.totalVods || 0}
					{data.totalVods === 1 ? 'match' : 'matches'}
					{#if events.length}<span class="block pt-1.5 text-paper-bg/45"
							>from {events.length} {events.length === 1 ? 'event' : 'events'}</span
						>{/if}
				</p>
			</div>
			<div
				class="fp-rise mt-6 h-[5px] border-t border-b border-paper-bg/30 md:mt-8"
				style="animation-delay: 260ms;"
				aria-hidden="true"
			></div>

			<!-- the newest match, as a spread -->
			{#if lead}
				<a
					href={lead.href}
					class="fp-rise group mt-8 grid overflow-hidden border border-paper-bg/20 md:mt-10 md:grid-cols-[7fr_5fr]"
					style="animation-delay: 300ms;"
				>
					<span class="relative block aspect-video overflow-hidden bg-black">
						{#if lead.picture}
							<Picture
								image={lead.picture}
								sizes="(min-width: 1024px) 700px, 100vw"
								class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
								fetchpriority="high"
							/>
						{:else}
							<img
								src={lead.still(1280)}
								alt=""
								class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
							/>
						{/if}
						{#if lead.premium}<PremiumTag variant="corner" size="lg" />{/if}
						{@render play('lg')}
						{#if lead.length}
							<span
								class="absolute bottom-0 left-0 z-[2] bg-ink/85 px-2.5 py-1 font-newsreader text-[13px] text-paper-bg tabular-nums"
								>{lead.length}</span
							>
						{/if}
					</span>
					<span class="flex flex-col justify-center p-6 md:p-8 lg:p-10">
						<span
							class="flex items-center gap-2.5 text-[9.5px] font-extrabold tracking-[0.2em] text-warm-light uppercase"
							>Latest match · {lead.rubric}</span
						>
						<span
							class="mt-3 block font-newsreader text-[28px] leading-[1.04] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[36px]"
						>
							<span class="fp-ul">{lead.title}</span>
						</span>
						{#if lead.players}
							<span class="mt-3 block font-newsreader text-[17px] text-paper-bg/75 italic"
								>{lead.players}</span
							>
						{/if}
						{#if lead.heroes}
							<span
								class="mt-1.5 block text-[9.5px] font-extrabold tracking-[0.14em] text-paper-bg/50 uppercase"
								>{lead.heroes}</span
							>
						{/if}
						<span class="mt-6 block">
							<FrontByline
								author="AGE Studios"
								date={lead.date}
								length={lead.length}
								premium={false}
								onDark
							/>
						</span>
					</span>
				</a>
			{/if}
		</div>
	</section>

	<!-- ============ matches ============ -->
	<section
		id="matches"
		class="mx-auto w-full max-w-[1200px] scroll-mt-20 px-5 pt-12 pb-12 md:px-8 md:pt-16 md:pb-16"
	>
		<div class="flex items-center gap-4 md:gap-6">
			<span class="h-px flex-1 bg-ink"></span>
			<h2
				class="font-newsreader text-[17px] font-semibold tracking-[0.22em] whitespace-nowrap uppercase md:text-[20px]"
			>
				All matches
			</h2>
			<span class="h-px flex-1 bg-ink"></span>
		</div>
		<div class="mt-2 flex justify-center" aria-hidden="true">
			<span class="h-[3px] w-10 bg-warm"></span>
		</div>

		<!-- filter bar -->
		<div
			class="mt-8 flex flex-col gap-5 border-y border-line py-5 md:mt-10 md:flex-row md:flex-wrap md:items-center md:gap-x-8 md:gap-y-3 md:py-4"
		>
			<label
				class="relative flex items-center gap-2.5 border border-line2 bg-paper-bg px-3.5 py-2.5 md:w-[280px] md:border-0 md:bg-transparent md:p-0"
			>
				<svg
					class="h-3.5 w-3.5 shrink-0 text-warm"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"
				>
					<circle cx="8.5" cy="8.5" r="5.5" />
					<path d="M13 13l4.5 4.5" stroke-linecap="square" />
				</svg>
				<span class="sr-only">Search matches</span>
				<input
					type="search"
					value={filters.q}
					oninput={onSearch}
					placeholder="Search titles and players"
					autocomplete="off"
					class="w-full border-0 bg-transparent p-0 font-newsreader text-[16px] leading-tight text-ink placeholder:text-fade focus:outline-none md:border-b md:border-line2 md:py-1 md:focus:border-warm"
				/>
			</label>
			<div
				class="grid grid-cols-2 items-end gap-x-5 gap-y-4 md:ml-auto md:flex md:items-center md:gap-6"
			>
				{#if heroOptions.length > 1}
					<FilterSelect label="Hero" bind:value={hero} options={heroOptions} />
				{/if}
				{#if eventOptions.length > 1}
					<FilterSelect label="Event" bind:value={eventId} options={eventOptions} />
				{/if}
				<FilterSelect label="Sort" bind:value={sort} options={SORTS} />
				{#if activeCount}
					<button
						type="button"
						onclick={clearAll}
						class="col-span-2 justify-self-start text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase transition-[letter-spacing] hover:tracking-[0.22em] md:col-span-1"
						>Clear ×</button
					>
				{/if}
			</div>
		</div>

		<p class="mt-4 font-newsreader text-[15px] text-soft italic" aria-live="polite">{resultLine}</p>

		{#if grid.length}
			<ul class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
				{#each grid as f, i (f.id)}
					<li class="border border-line bg-paper-bg" use:reveal={{ delay: (i % 3) * 60 }}>
						<a href={f.href} class="group flex h-full flex-col">
							<span class="relative block aspect-video overflow-hidden bg-ink">
								{#if f.premium}<PremiumTag variant="corner" />{/if}
								{#if f.picture}
									<Picture
										image={f.picture}
										sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
										class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
										loading="lazy"
									/>
								{:else}
									<img
										src={f.still(720)}
										alt=""
										loading="lazy"
										class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
									/>
								{/if}
								{@render play()}
								{#if f.length}
									<span
										class="absolute bottom-0 left-0 bg-ink/85 px-2 py-1 font-newsreader text-[12px] text-paper-bg tabular-nums"
										>{f.length}</span
									>
								{/if}
							</span>
							<span class="flex flex-1 flex-col p-5">
								<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-warm uppercase">
									{f.rubric}
								</span>
								<span class="mt-2 block font-newsreader text-[19px] leading-[1.15] font-semibold">
									<span class="fp-ul">{f.title}</span>
								</span>
								{#if f.players && f.players !== f.title}
									<span class="mt-1.5 block font-newsreader text-[14.5px] text-soft italic"
										>{f.players}</span
									>
								{/if}
								{#if f.heroes}
									<span
										class="mt-1 block text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>{f.heroes}</span
									>
								{/if}
								<span class="mt-auto block pt-4">
									<FrontByline author="AGE Studios" date={f.date} premium={false} size="sm" />
								</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else if !lead}
			<div class="mt-8 border-[3px] border-double border-ink px-6 py-12 text-center">
				{#if activeCount}
					<p class="font-newsreader text-[24px] font-semibold">No matches for that.</p>
					<p class="mt-2 font-newsreader text-[16px] text-soft italic">
						Try another hero or event, or clear the filters to see everything.
					</p>
					<button
						type="button"
						onclick={clearAll}
						class="mt-5 inline-flex items-center bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm"
						>Show every match</button
					>
				{:else}
					<p class="font-newsreader text-[24px] font-semibold">
						The first matches are on their way.
					</p>
					<p class="mt-2 font-newsreader text-[16px] text-soft italic">
						AGE Studios films the main stage at every AGE Open. New matches land here after each
						event.
					</p>
				{/if}
			</div>
		{/if}

		{#if pagination.totalPages > 1}
			<nav
				class="mt-8 flex items-center justify-between gap-6 border-t border-line pt-5"
				aria-label="Pages"
			>
				<button
					type="button"
					onclick={() => gotoPage(pagination.page - 1)}
					disabled={pagination.page <= 1}
					class="text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors enabled:hover:text-warm disabled:text-line2"
					>← Previous</button
				>
				<ol
					class="flex items-baseline gap-4 font-newsreader text-[17px] tabular-nums"
					aria-label="Page {pagination.page} of {pagination.totalPages}"
				>
					{#each pageNumbers as n, i (`${n}-${i}`)}
						<li>
							{#if n === '…'}
								<span class="text-fade">…</span>
							{:else}
								<button
									type="button"
									onclick={() => gotoPage(/** @type {number} */ (n))}
									aria-current={n === pagination.page ? 'page' : undefined}
									class="fp-ul pb-0.5 transition-colors hover:text-warm {n === pagination.page
										? '[background-size:100%_1.5px] font-semibold text-warm'
										: 'text-soft'}">{n}</button
								>
							{/if}
						</li>
					{/each}
				</ol>
				<button
					type="button"
					onclick={() => gotoPage(pagination.page + 1)}
					disabled={pagination.page >= pagination.totalPages}
					class="text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors enabled:hover:text-warm disabled:text-line2"
					>Next →</button
				>
			</nav>
		{/if}
	</section>

	<!-- ============ premium ============ -->
	{#if !member}
		<section class="mx-auto w-full max-w-[1200px] px-5 pb-14 md:px-8 md:pb-20" use:reveal>
			<div
				class="grid gap-6 border-[3px] border-double border-ink bg-paper px-6 py-8 md:grid-cols-[1fr_auto] md:items-center md:px-10 md:py-10"
			>
				<div>
					<div class="text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase">
						<span aria-hidden="true">◆</span> Premium
					</div>
					<p
						class="mt-3 font-newsreader text-[28px] leading-[1.05] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[34px]"
					>
						Watch every match.
					</p>
					<p class="mt-3 max-w-[560px] font-newsreader text-[16px] leading-[1.5] text-soft italic">
						Premium opens all of the bonus gameplay, along with every article and video in the
						Library.
					</p>
				</div>
				<a
					href="/premium"
					class="inline-flex items-center gap-2 justify-self-start border-[1.5px] border-prem bg-prem px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
				>
					<span class="text-[8px] opacity-80" aria-hidden="true">◆</span>
					Get Premium
				</a>
			</div>
		</section>
	{/if}
</AgeShell>
