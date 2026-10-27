<script>
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	export let data;

	$: vods = data.vods || [];
	$: pagination = data.pagination || { page: 1, totalPages: 0, total: 0 };
	$: filters = data.filters || { q: '', event: '', hero: '', sort: 'newest' };
	$: heroes = data.heroes || [];
	$: events = data.events || [];
	$: totalVods = data.totalVods || 0;
	$: isPremiumMember = $page.data?.isPremiumMember ?? false;
	$: activeFilterCount = [filters.q, filters.event, filters.hero].filter(Boolean).length;

	let showFilters = false;

	let searchTimeout;
	function handleSearch(e) {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			updateFilters({ q: e.target.value, page: null });
		}, 300);
	}

	function updateFilters(updates) {
		const url = new URL($page.url);
		for (const [key, value] of Object.entries(updates)) {
			if (value) url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		}
		if (!('page' in updates)) url.searchParams.delete('page');
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	function clearAllFilters() {
		goto('/library/vods', { replaceState: true });
	}

	function removeFilter(key) {
		updateFilters({ [key]: null });
	}

	function formatDuration(seconds) {
		if (!seconds) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getPageNumbers(current, total) {
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const pages = [];
		pages.push(1);
		if (current > 3) pages.push('...');
		for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
			pages.push(i);
		}
		if (current < total - 2) pages.push('...');
		pages.push(total);
		return pages;
	}

	function getEventLabel(ev) {
		if (!ev) return '';
		let label = ev.title || '';
		if (ev.circuit) label += ` — ${ev.circuit}`;
		if (ev.eventDate) {
			const d = new Date(ev.eventDate);
			label += ` (${d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', timeZone: 'UTC' })})`;
		}
		return label;
	}

	function getEventTitle(id) {
		const ev = events.find((e) => e.id === id);
		return ev ? getEventLabel(ev) : id;
	}

	function vodThumbnail(v) {
		if (!v.muxPlaybackId) return '';
		const token = v.thumbnailToken ? `&token=${v.thumbnailToken}` : '';
		return `https://image.mux.com/${v.muxPlaybackId}/thumbnail.webp?width=640&height=360&fit_mode=smartcrop${token}`;
	}

	const SORT_OPTIONS = [
		{ value: 'newest', label: 'Newest first' },
		{ value: 'oldest', label: 'Oldest first' },
		{ value: 'longest', label: 'Longest first' }
	];
</script>

<svelte:head>
	<title>Tournament VODs — Library — AGE</title>
	<meta
		name="description"
		content="Every tournament VOD from AGE Open and partner events. Filter by hero, event, and date."
	/>
</svelte:head>

<AgeShell active="Library">
	<div class="mx-auto w-full max-w-[1600px] px-4 pt-10 pb-[52px] md:px-10 lg:px-14">
		<!-- ============ BREADCRUMB ============ -->
		<nav
			class="mb-6 flex items-center gap-2 text-[11px] font-extrabold tracking-[0.12em] text-fade uppercase"
		>
			<a href="/library" class="transition-colors hover:text-ink">Library</a>
			<span class="opacity-60" aria-hidden="true">/</span>
			<span class="text-ink">Tournament VODs</span>
		</nav>

		<!-- ============ HEADER ============ -->
		<div
			class="mb-[26px] grid grid-cols-1 items-end gap-6 border border-t-[3px] border-line2 border-t-prem bg-paper px-[26px] py-[26px] md:grid-cols-[1fr_auto] md:px-[34px] md:py-[30px]"
		>
			<div>
				<div class="mb-[10px] flex flex-wrap items-center gap-[10px]">
					<span
						class="inline-flex items-center gap-2 font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>
						<span class="inline-block h-[6px] w-[6px] rounded-full bg-warm"></span>
						AGE Studios · Gameplay
					</span>
				</div>
				<h1
					class="mb-2 font-newsreader text-[38px] leading-[0.9] font-semibold tracking-[-0.02em] sm:text-[48px]"
				>
					Tournament VODs
				</h1>
				<p class="max-w-[560px] text-[14.5px] leading-[1.5] text-soft">
					Every tournament match we've filmed, from AGE Open events and partner circuits — filter by
					hero, event, or search a player by name.
				</p>
			</div>

			<div class="flex items-end gap-[14px]">
				<div
					class="flex flex-col items-center justify-center self-stretch border border-line2 px-[22px] py-[16px] text-center"
				>
					<div class="font-newsreader text-[38px] leading-[0.8] font-semibold tabular-nums">
						{totalVods}
					</div>
					<div class="mt-2 text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase">
						Matches
					</div>
				</div>
				<button
					type="button"
					onclick={() => (showFilters = !showFilters)}
					class="relative inline-flex items-center gap-[8px] self-stretch border-[1.5px] border-ink bg-transparent px-[16px] text-[11px] font-extrabold tracking-[0.08em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg lg:hidden"
					aria-expanded={showFilters}
				>
					<svg
						viewBox="0 0 24 24"
						class="h-[13px] w-[13px]"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M4 6h16M6 12h12M10 18h4" />
					</svg>
					Filters
					{#if activeFilterCount > 0}
						<span
							class="flex h-[16px] w-[16px] items-center justify-center bg-prem text-[9px] font-extrabold text-white tabular-nums"
						>
							{activeFilterCount}
						</span>
					{/if}
				</button>
			</div>
		</div>

		<!-- ============ ACTIVE FILTER CHIPS ============ -->
		{#if activeFilterCount > 0}
			<div class="mb-[26px] flex flex-wrap items-center gap-[10px]">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					Showing
				</span>
				{#if filters.q}
					<button
						type="button"
						onclick={() => removeFilter('q')}
						class="inline-flex items-center gap-[8px] border border-line2 bg-paper px-[11px] py-[5px] text-[11px] font-bold tracking-[0.02em] text-ink transition-colors hover:border-ink"
					>
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Search</span
						>
						<span>"{filters.q}"</span>
						<span class="text-fade" aria-hidden="true">×</span>
					</button>
				{/if}
				{#if filters.hero}
					<button
						type="button"
						onclick={() => removeFilter('hero')}
						class="inline-flex items-center gap-[8px] border border-line2 bg-paper px-[11px] py-[5px] text-[11px] font-bold tracking-[0.02em] text-ink transition-colors hover:border-ink"
					>
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Hero</span
						>
						<span>{filters.hero}</span>
						<span class="text-fade" aria-hidden="true">×</span>
					</button>
				{/if}
				{#if filters.event}
					<button
						type="button"
						onclick={() => removeFilter('event')}
						class="inline-flex items-center gap-[8px] border border-line2 bg-paper px-[11px] py-[5px] text-[11px] font-bold tracking-[0.02em] text-ink transition-colors hover:border-ink"
					>
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Event</span
						>
						<span class="max-w-[220px] truncate">{getEventTitle(filters.event)}</span>
						<span class="text-fade" aria-hidden="true">×</span>
					</button>
				{/if}
				<button
					type="button"
					onclick={clearAllFilters}
					class="text-[11px] font-extrabold tracking-[0.06em] text-warm uppercase transition-colors hover:text-ink"
				>
					Clear all →
				</button>
			</div>
		{/if}

		<!-- ============ MOBILE FILTER PANEL ============ -->
		{#if showFilters}
			<div class="mb-[26px] border border-line2 bg-paper p-5 lg:hidden">
				<div class="space-y-[18px]">
					<div>
						<label
							for="mobile-search"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Search
						</label>
						<input
							id="mobile-search"
							type="text"
							placeholder="Title or player name…"
							value={filters.q}
							oninput={handleSearch}
							class="w-full border-[1.5px] border-line2 bg-paper-bg px-3 py-[10px] text-[13.5px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink"
						/>
					</div>

					<div>
						<label
							for="mobile-sort"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Sort by
						</label>
						<select
							id="mobile-sort"
							value={filters.sort}
							onchange={(e) => updateFilters({ sort: e.target.value })}
							class="w-full border-[1.5px] border-line2 bg-paper-bg px-3 py-[10px] text-[13.5px] text-ink transition-colors outline-none hover:border-ink focus:border-ink"
						>
							{#each SORT_OPTIONS as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					{#if heroes.length > 0}
						<div>
							<label
								for="mobile-hero"
								class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>
								Hero
							</label>
							<select
								id="mobile-hero"
								value={filters.hero}
								onchange={(e) => updateFilters({ hero: e.target.value || null })}
								class="w-full border-[1.5px] border-line2 bg-paper-bg px-3 py-[10px] text-[13.5px] text-ink transition-colors outline-none hover:border-ink focus:border-ink"
							>
								<option value="">All heroes</option>
								{#each heroes as h (h)}
									<option value={h}>{h}</option>
								{/each}
							</select>
						</div>
					{/if}

					{#if events.length > 0}
						<div>
							<label
								for="mobile-event"
								class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>
								Event
							</label>
							<select
								id="mobile-event"
								value={filters.event}
								onchange={(e) => updateFilters({ event: e.target.value || null })}
								class="w-full border-[1.5px] border-line2 bg-paper-bg px-3 py-[10px] text-[13.5px] text-ink transition-colors outline-none hover:border-ink focus:border-ink"
							>
								<option value="">All events</option>
								{#each events as ev (ev.id)}
									<option value={ev.id}>{getEventLabel(ev)}</option>
								{/each}
							</select>
						</div>
					{/if}

					{#if activeFilterCount > 0}
						<button
							type="button"
							onclick={clearAllFilters}
							class="w-full cursor-pointer border-[1.5px] border-warm bg-transparent py-[10px] text-[11px] font-extrabold tracking-[0.06em] text-warm uppercase transition-colors hover:bg-warm hover:text-paper-bg"
						>
							Clear all filters
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<!-- ============ MAIN GRID ============ -->
		<div class="grid grid-cols-1 items-start gap-[26px] lg:grid-cols-[minmax(0,1fr)_280px]">
			<!-- ------------ VOD GRID ------------ -->
			<div class="min-w-0">
				{#if vods.length > 0}
					<div class="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
						{#each vods as v (v.id)}
							<a
								href="/library/{v.id}"
								class="group flex flex-col overflow-hidden border border-line2 bg-paper transition-colors hover:border-ink"
							>
								<!-- thumbnail -->
								<div class="relative aspect-video overflow-hidden bg-ink">
									{#if v.muxPlaybackId}
										<div
											class="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.05]"
											style="background-image: url('{vodThumbnail(v)}');"
										></div>
										<span
											class="pointer-events-none absolute inset-0 z-[1]"
											style="background: linear-gradient(0deg, rgba(20,16,8,0.55), transparent 55%);"
											aria-hidden="true"
										></span>
									{:else}
										<div class="absolute inset-0 z-0 flex items-center justify-center text-fade">
											<svg
												viewBox="0 0 24 24"
												class="h-8 w-8"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<rect x="3" y="5" width="18" height="14" rx="1" />
												<path d="M10 9l5 3-5 3z" fill="currentColor" />
											</svg>
										</div>
									{/if}

									<span
										class="absolute top-[10px] left-[10px] z-[2] inline-flex items-center gap-[6px] bg-white/95 px-[8px] py-[3px] text-[9.5px] font-extrabold tracking-[0.08em] text-ink uppercase"
									>
										<svg viewBox="0 0 24 24" class="h-[10px] w-[10px]" fill="currentColor">
											<path d="M8 5v14l11-7z" />
										</svg>
										VOD
									</span>

									{#if v.isPremium}<PremiumTag variant="corner" />{/if}

									<span
										class="absolute top-1/2 left-1/2 z-[2] flex h-[48px] w-[48px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 pl-[3px] text-ink transition-transform group-hover:scale-110"
										aria-hidden="true"
									>
										<svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor">
											<path d="M8 5v14l11-7z" />
										</svg>
									</span>

									{#if v.duration}
										<span
											class="absolute right-[10px] bottom-[10px] z-[2] bg-black/85 px-[8px] py-[3px] font-mono-system text-[10.5px] font-bold text-white tabular-nums"
										>
											{formatDuration(v.duration)}
										</span>
									{/if}
								</div>

								<!-- body -->
								<div class="flex flex-1 flex-col px-[18px] py-[16px]">
									<h3
										class="mb-[10px] line-clamp-2 font-newsreader text-[19px] leading-[1.15] font-semibold tracking-[-0.01em] text-ink transition-colors group-hover:text-warm"
									>
										{v.title}
									</h3>

									{#if v.player1Name && v.player2Name}
										<div class="mb-[8px] flex items-center gap-[8px] text-[12.5px] font-semibold">
											<span class="text-ink">{v.player1Name}</span>
											<span class="text-fade">vs</span>
											<span class="text-ink">{v.player2Name}</span>
										</div>
									{/if}

									{#if v.player1Hero || v.player2Hero}
										<div
											class="mb-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.1em] text-fade uppercase"
										>
											{[v.player1Hero, v.player2Hero].filter(Boolean).join(' · ')}
										</div>
									{/if}

									<div
										class="mt-auto flex items-center justify-between border-t border-line2 pt-[10px] text-[10.5px] font-extrabold tracking-[0.08em] text-fade uppercase"
									>
										{#if v.publishedAt}
											<span class="font-mono-system">{formatDate(v.publishedAt)}</span>
										{:else}
											<span></span>
										{/if}
										<span
											class="inline-flex items-center gap-[4px] text-accent transition-colors group-hover:text-warm"
										>
											Watch →
										</span>
									</div>
								</div>
							</a>
						{/each}
					</div>

					<!-- ============ PAGINATION ============ -->
					{#if pagination.totalPages > 1}
						<div class="mt-[34px] flex flex-wrap items-center justify-center gap-[10px]">
							<button
								type="button"
								onclick={() => updateFilters({ page: pagination.page - 1 })}
								disabled={pagination.page === 1}
								class="cursor-pointer border-[1.5px] border-ink bg-transparent px-[18px] py-[9px] text-[11px] font-extrabold tracking-[0.06em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:cursor-not-allowed disabled:opacity-30"
							>
								← Prev
							</button>

							{#each getPageNumbers(pagination.page, pagination.totalPages) as p, i (i)}
								{#if p === '...'}
									<span class="px-[6px] font-mono-system text-[13px] font-bold text-fade">…</span>
								{:else}
									<button
										type="button"
										onclick={() => updateFilters({ page: p })}
										class="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center border font-mono-system text-[12px] font-extrabold tabular-nums transition-colors {p ===
										pagination.page
											? 'border-ink bg-ink text-paper-bg'
											: 'border-line2 bg-paper text-soft hover:border-ink hover:text-ink'}"
									>
										{p}
									</button>
								{/if}
							{/each}

							<button
								type="button"
								onclick={() => updateFilters({ page: pagination.page + 1 })}
								disabled={pagination.page === pagination.totalPages}
								class="cursor-pointer border-[1.5px] border-ink bg-transparent px-[18px] py-[9px] text-[11px] font-extrabold tracking-[0.06em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:cursor-not-allowed disabled:opacity-30"
							>
								Next →
							</button>
						</div>
					{/if}
				{:else if activeFilterCount > 0}
					<!-- No results with filters -->
					<div
						class="flex flex-col items-center border border-line2 bg-paper px-6 py-[60px] text-center"
					>
						<span
							class="mb-4 flex h-[52px] w-[52px] items-center justify-center border border-line2 text-fade"
						>
							<svg
								viewBox="0 0 24 24"
								class="h-6 w-6"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="11" cy="11" r="7" />
								<path d="M16.5 16.5L21 21" />
							</svg>
						</span>
						<h3
							class="mb-2 font-newsreader text-[26px] leading-[1] font-semibold tracking-[-0.01em]"
						>
							No matches
						</h3>
						<p class="mx-auto mb-6 max-w-[420px] text-[14px] text-soft">
							Nothing lines up with the filters you've set. Try widening the search or clearing a
							dimension.
						</p>
						<button
							type="button"
							onclick={clearAllFilters}
							class="cursor-pointer border-[1.5px] border-ink bg-transparent px-[20px] py-[10px] text-[11px] font-extrabold tracking-[0.06em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg"
						>
							Clear all filters
						</button>
					</div>
				{:else}
					<!-- No VODs at all -->
					<div
						class="flex flex-col items-center border border-line2 bg-paper px-6 py-[64px] text-center"
					>
						<span
							class="mb-4 flex h-[52px] w-[52px] items-center justify-center border border-line2 text-fade"
						>
							<svg
								viewBox="0 0 24 24"
								class="h-6 w-6"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect x="3" y="5" width="18" height="14" rx="1" />
								<path d="M10 9l5 3-5 3z" fill="currentColor" />
							</svg>
						</span>
						<h3
							class="mb-2 font-newsreader text-[28px] leading-[1] font-semibold tracking-[-0.01em]"
						>
							Tournament VODs coming soon
						</h3>
						<p class="mx-auto max-w-[440px] text-[14px] text-soft">
							We film every AGE Open and partner-circuit main stage. New matches land here as we
							finish coverage.
						</p>
					</div>
				{/if}
			</div>

			<!-- ------------ SIDEBAR ------------ -->
			<aside class="hidden flex-col gap-[18px] lg:flex">
				<!-- Search -->
				<div class="border border-line2 bg-paper">
					<header class="border-b border-line2 px-[18px] py-[13px]">
						<h3
							class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
						>
							Search
						</h3>
					</header>
					<div class="p-[18px]">
						<input
							type="text"
							placeholder="Title or player name…"
							value={filters.q}
							oninput={handleSearch}
							class="w-full border-[1.5px] border-line2 bg-paper-bg px-3 py-[10px] text-[13.5px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink"
						/>
					</div>
				</div>

				<!-- Sort -->
				<div class="border border-line2 bg-paper">
					<header class="border-b border-line2 px-[18px] py-[13px]">
						<h3
							class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
						>
							Sort by
						</h3>
					</header>
					<div class="flex flex-col p-[10px]">
						{#each SORT_OPTIONS as option (option.value)}
							<button
								type="button"
								onclick={() => updateFilters({ sort: option.value })}
								class="cursor-pointer px-[10px] py-[9px] text-left text-[12.5px] font-bold tracking-[0.02em] transition-colors {filters.sort ===
								option.value
									? 'border-l-[3px] border-l-prem bg-paper-bg text-ink'
									: 'border-l-[3px] border-transparent text-soft hover:text-ink'}"
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Hero -->
				{#if heroes.length > 0}
					<div class="border border-line2 bg-paper">
						<header class="border-b border-line2 px-[18px] py-[13px]">
							<h3
								class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>
								Hero
							</h3>
						</header>
						<div class="p-[18px]">
							<select
								value={filters.hero}
								onchange={(e) => updateFilters({ hero: e.target.value || null })}
								class="w-full border-[1.5px] border-line2 bg-paper-bg px-3 py-[10px] text-[13.5px] text-ink transition-colors outline-none hover:border-ink focus:border-ink"
							>
								<option value="">All heroes</option>
								{#each heroes as h (h)}
									<option value={h}>{h}</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}

				<!-- Event -->
				{#if events.length > 0}
					<div class="border border-line2 bg-paper">
						<header class="border-b border-line2 px-[18px] py-[13px]">
							<h3
								class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>
								Event
							</h3>
						</header>
						<div class="p-[18px]">
							<select
								value={filters.event}
								onchange={(e) => updateFilters({ event: e.target.value || null })}
								class="w-full border-[1.5px] border-line2 bg-paper-bg px-3 py-[10px] text-[13.5px] text-ink transition-colors outline-none hover:border-ink focus:border-ink"
							>
								<option value="">All events</option>
								{#each events as ev (ev.id)}
									<option value={ev.id}>{getEventLabel(ev)}</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}

				<!-- Clear all -->
				{#if activeFilterCount > 0}
					<button
						type="button"
						onclick={clearAllFilters}
						class="cursor-pointer border-[1.5px] border-warm bg-transparent px-[18px] py-[12px] text-[11px] font-extrabold tracking-[0.06em] text-warm uppercase transition-colors hover:bg-warm hover:text-paper-bg"
					>
						Clear all filters
					</button>
				{/if}

				<!-- Premium CTA — hidden for members who already have Premium -->
				{#if !isPremiumMember}
					<div class="relative border-t-[3px] border-t-ink bg-prem px-[22px] py-[22px] text-white">
						<span
							class="mb-3 inline-block bg-white px-[10px] py-[4px] text-[9.5px] font-extrabold tracking-[0.14em] text-prem uppercase"
						>
							AGE Premium
						</span>
						<h4 class="mb-2 font-newsreader text-[22px] leading-[1.1] font-semibold">
							Every VOD, unlocked.
						</h4>
						<p class="mb-[14px] text-[12.5px] leading-[1.5]" style="color: #d6eedf;">
							Members get the full match library — plus premium articles and course updates.
						</p>
						<a
							href="/premium"
							class="inline-flex w-full items-center justify-center gap-2 border-[1.5px] border-white bg-transparent py-[10px] text-[11px] font-bold tracking-[0.06em] uppercase transition-colors hover:bg-white/10"
						>
							Get Premium →
						</a>
					</div>
				{/if}
			</aside>
		</div>
	</div>
</AgeShell>
