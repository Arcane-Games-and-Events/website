<script>
	import { icons } from '$lib/icons';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	export let data;

	$: vods = data.vods || [];
	$: pagination = data.pagination || { page: 1, totalPages: 0, total: 0 };
	$: filters = data.filters || { q: '', event: '', hero: '', sort: 'newest' };
	$: heroes = data.heroes || [];
	$: events = data.events || [];
	$: totalVods = data.totalVods || 0;
	$: isPremiumUser = data.user?.role === 'premium' || data.user?.role === 'admin';

	// Mobile filter panel toggle
	let showFilters = false;

	// Count active filters
	$: activeFilterCount = [filters.q, filters.event, filters.hero].filter(Boolean).length;

	// Debounced search
	let searchTimeout;
	function handleSearch(e) {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			updateFilters({ q: e.target.value, page: null });
		}, 300);
	}

	// Update filters via URL params
	function updateFilters(updates) {
		const url = new URL($page.url);
		for (const [key, value] of Object.entries(updates)) {
			if (value) {
				url.searchParams.set(key, value);
			} else {
				url.searchParams.delete(key);
			}
		}
		// Reset to page 1 when filters change (unless page is explicitly set)
		if (!('page' in updates)) {
			url.searchParams.delete('page');
		}
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	function clearAllFilters() {
		goto('/studios/vods', { replaceState: true });
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

	// Pagination helpers
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

	// Format event label with circuit and date
	function getEventLabel(ev) {
		if (!ev) return '';
		let label = ev.title || '';
		if (ev.circuit) label += ` - ${ev.circuit}`;
		if (ev.eventDate) {
			const d = new Date(ev.eventDate);
			label += ` (${d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', timeZone: 'UTC' })})`;
		}
		return label;
	}

	// Get event title by ID
	function getEventTitle(id) {
		const ev = events.find((e) => e.id === id);
		return ev ? getEventLabel(ev) : id;
	}
</script>

<svelte:head>
	<title>Tournament VODs - AGE Studios</title>
	<meta
		name="description"
		content="Browse all tournament VODs from Arcane Games and Events. Filter by hero, event, and more."
	/>
</svelte:head>

<div class="min-h-screen overflow-x-hidden">
	<div class="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
		<!-- Breadcrumb -->
		<nav class="mb-4 flex items-center gap-2 text-xs text-gray-500 sm:mb-6 sm:text-sm">
			<a href="/studios" class="transition-colors hover:text-white">Studios</a>
			<svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
			</svg>
			<span class="text-gray-300">VODs</span>
		</nav>

		<!-- Page Header -->
		<div class="mb-6 flex items-end justify-between sm:mb-8">
			<div>
				<h1 class="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
					Tournament VODs
				</h1>
				<p class="mt-1 text-xs text-gray-400 sm:text-sm">
					{totalVods} video{totalVods !== 1 ? 's' : ''} available
				</p>
			</div>
			<!-- Mobile filter toggle -->
			<button
				onclick={() => (showFilters = !showFilters)}
				class="flex items-center gap-1.5 rounded-lg border border-white/10 bg-gray-900/60 px-3 py-2 text-xs text-gray-300 transition-colors hover:border-white/20 hover:text-white sm:text-sm lg:hidden"
			>
				<svg
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
					/>
				</svg>
				Filters
				{#if activeFilterCount > 0}
					<span
						class="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
					>
						{activeFilterCount}
					</span>
				{/if}
			</button>
		</div>

		<!-- Mobile Filter Panel -->
		{#if showFilters}
			<div class="mb-6 rounded-xl border border-white/10 bg-gray-900/60 p-4 lg:hidden">
				<div class="space-y-4">
					<!-- Search -->
					<div>
						<label for="mobile-search" class="mb-1.5 block text-xs font-medium text-gray-400"
							>Search</label
						>
						<div class="relative">
							<svg
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.magnifyingGlass} />
							</svg>
							<input
								id="mobile-search"
								type="text"
								placeholder="Search by title or player..."
								value={filters.q}
								oninput={handleSearch}
								class="w-full rounded-lg border border-white/10 bg-gray-800/60 py-2 pr-4 pl-9 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 focus:outline-none"
							/>
						</div>
					</div>

					<!-- Sort -->
					<div>
						<label for="mobile-sort" class="mb-1.5 block text-xs font-medium text-gray-400"
							>Sort by</label
						>
						<select
							id="mobile-sort"
							value={filters.sort}
							onchange={(e) => updateFilters({ sort: e.target.value })}
							class="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 focus:outline-none"
						>
							<option value="newest">Newest</option>
							<option value="oldest">Oldest</option>
							<option value="longest">Longest</option>
						</select>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<!-- Hero -->
						{#if heroes.length > 0}
							<div>
								<label for="mobile-hero" class="mb-1.5 block text-xs font-medium text-gray-400"
									>Hero</label
								>
								<select
									id="mobile-hero"
									value={filters.hero}
									onchange={(e) => updateFilters({ hero: e.target.value || null })}
									class="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 focus:outline-none"
								>
									<option value="">All Heroes</option>
									{#each heroes as h}
										<option value={h}>{h}</option>
									{/each}
								</select>
							</div>
						{/if}

						<!-- Event -->
						{#if events.length > 0}
							<div>
								<label for="mobile-event" class="mb-1.5 block text-xs font-medium text-gray-400"
									>Event</label
								>
								<select
									id="mobile-event"
									value={filters.event}
									onchange={(e) => updateFilters({ event: e.target.value || null })}
									class="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 focus:outline-none"
								>
									<option value="">All Events</option>
									{#each events as ev}
										<option value={ev.id}>{getEventLabel(ev)}</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>

					{#if activeFilterCount > 0}
						<button
							onclick={clearAllFilters}
							class="w-full rounded-lg border border-white/10 py-2 text-xs text-gray-400 transition-colors hover:border-red-500/30 hover:text-red-400"
						>
							Clear all filters
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Active Filter Chips (visible on all sizes when filters are active) -->
		{#if activeFilterCount > 0}
			<div class="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
				<span class="text-xs text-gray-500">Showing:</span>
				{#if filters.q}
					<button
						onclick={() => removeFilter('q')}
						class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-gray-900/60 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-red-500/30 hover:text-white"
					>
						"{filters.q}"
						<svg
							class="h-3 w-3 text-gray-500"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.xMark} />
						</svg>
					</button>
				{/if}
				{#if filters.hero}
					<button
						onclick={() => removeFilter('hero')}
						class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-gray-900/60 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-red-500/30 hover:text-white"
					>
						{filters.hero}
						<svg
							class="h-3 w-3 text-gray-500"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.xMark} />
						</svg>
					</button>
				{/if}
				{#if filters.event}
					<button
						onclick={() => removeFilter('event')}
						class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-gray-900/60 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-red-500/30 hover:text-white"
					>
						{getEventTitle(filters.event)}
						<svg
							class="h-3 w-3 text-gray-500"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.xMark} />
						</svg>
					</button>
				{/if}
				<button
					onclick={clearAllFilters}
					class="text-xs text-red-400 transition-colors hover:text-red-300"
				>
					Clear all
				</button>
			</div>
		{/if}

		<!-- Main Grid: Content + Sidebar -->
		<div class="grid w-full gap-6 sm:gap-8 lg:grid-cols-4 lg:gap-10">
			<!-- VOD Grid (3/4) -->
			<div class="min-w-0 lg:col-span-3">
				{#if vods.length > 0}
					<div class="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
						{#each vods as vodItem (vodItem.id)}
							<a
								href="/studios/vod/{vodItem.id}"
								class="group min-w-0 overflow-hidden rounded-lg border border-white/5 bg-gray-900/40 transition-all hover:border-white/15 hover:bg-gray-900/60 sm:rounded-xl"
							>
								<!-- Thumbnail -->
								<div class="relative aspect-video overflow-hidden bg-gray-800">
									{#if vodItem.muxPlaybackId}
										<img
											src="https://image.mux.com/{vodItem.muxPlaybackId}/thumbnail.webp?width=480&height=270&fit_mode=smartcrop{vodItem.thumbnailToken
												? `&token=${vodItem.thumbnailToken}`
												: ''}"
											alt=""
											class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
											loading="lazy"
										/>
									{:else}
										<div class="flex h-full items-center justify-center">
											<svg
												class="h-10 w-10 text-gray-600"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												viewBox="0 0 24 24"
											>
												<path stroke-linecap="round" stroke-linejoin="round" d={icons.playCircle} />
											</svg>
										</div>
									{/if}
									<!-- Play overlay -->
									<div
										class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20"
									>
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/90 opacity-0 shadow-lg transition-all group-hover:scale-110 group-hover:opacity-100"
										>
											<svg
												class="h-5 w-5 translate-x-0.5 text-white"
												fill="currentColor"
												viewBox="0 0 24 24"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
										</div>
									</div>
									<!-- Duration badge -->
									{#if vodItem.duration}
										<div
											class="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white"
										>
											{formatDuration(vodItem.duration)}
										</div>
									{/if}
									<!-- Premium badge -->
									{#if vodItem.isPremium}
										<div
											class="absolute top-2 left-2 flex items-center gap-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-xs font-semibold text-white"
										>
											<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
												<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
											</svg>
											Premium
										</div>
									{/if}
								</div>
								<!-- Info -->
								<div class="min-w-0 overflow-hidden p-2 sm:p-3">
									<h3
										class="mb-0.5 line-clamp-2 text-xs leading-tight font-semibold text-white transition-colors group-hover:text-red-400 sm:mb-1 sm:text-sm"
									>
										{vodItem.title}
									</h3>
									<div
										class="flex flex-wrap items-center gap-1 text-[10px] text-gray-500 sm:gap-2 sm:text-xs"
									>
										{#if vodItem.player1Name && vodItem.player2Name}
											<span class="hidden rounded bg-white/5 px-1.5 py-0.5 sm:inline"
												>{vodItem.player1Name} vs {vodItem.player2Name}</span
											>
										{/if}
										{#if vodItem.player1Hero || vodItem.player2Hero}
											<span class="hidden text-gray-600 md:inline">
												{[vodItem.player1Hero, vodItem.player2Hero].filter(Boolean).join(' / ')}
											</span>
										{/if}
										{#if vodItem.publishedAt}
											<span>{formatDate(vodItem.publishedAt)}</span>
										{/if}
									</div>
								</div>
							</a>
						{/each}
					</div>

					<!-- Pagination -->
					{#if pagination.totalPages > 1}
						<div class="mt-6 flex items-center justify-center gap-1 sm:mt-8 sm:gap-1.5">
							<!-- Previous -->
							{#if pagination.page > 1}
								<button
									onclick={() => updateFilters({ page: pagination.page - 1 })}
									class="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-white sm:px-3 sm:text-sm"
								>
									Prev
								</button>
							{/if}

							<!-- Page numbers -->
							{#each getPageNumbers(pagination.page, pagination.totalPages) as p}
								{#if p === '...'}
									<span class="px-1 text-xs text-gray-600 sm:px-2 sm:text-sm">...</span>
								{:else}
									<button
										onclick={() => updateFilters({ page: p })}
										class="h-8 min-w-8 rounded-lg text-xs transition-colors sm:text-sm {p ===
										pagination.page
											? 'border border-red-500/50 bg-red-500/10 font-semibold text-red-400'
											: 'border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}"
									>
										{p}
									</button>
								{/if}
							{/each}

							<!-- Next -->
							{#if pagination.page < pagination.totalPages}
								<button
									onclick={() => updateFilters({ page: pagination.page + 1 })}
									class="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-white sm:px-3 sm:text-sm"
								>
									Next
								</button>
							{/if}
						</div>
					{/if}
				{:else if filters.q || filters.hero || filters.event}
					<!-- No results with active filters -->
					<div
						class="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gray-900/40 px-4 py-16 text-center"
					>
						<svg
							class="mb-3 h-12 w-12 text-gray-600"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.magnifyingGlass} />
						</svg>
						<p class="text-sm font-medium text-gray-400">No VODs match your filters</p>
						<p class="mt-1 text-xs text-gray-500">Try adjusting your search or filter criteria</p>
						<button
							onclick={clearAllFilters}
							class="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm text-red-400 transition-colors hover:border-red-500/30 hover:text-red-300"
						>
							Clear all filters
						</button>
					</div>
				{:else}
					<!-- No VODs at all -->
					<div
						class="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gray-900/40 px-4 py-16 text-center"
					>
						<svg
							class="mb-3 h-12 w-12 text-gray-600"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.playCircle} />
						</svg>
						<p class="text-sm font-medium text-gray-400">Tournament VODs coming soon</p>
						<p class="mt-1 text-xs text-gray-500">
							Premium members will get full access to all tournament recordings
						</p>
					</div>
				{/if}
			</div>

			<!-- Sidebar (1/4) - Hidden on mobile, shown on lg+ -->
			<div class="hidden min-w-0 flex-col gap-5 lg:flex">
				<!-- Search -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">Search</h3>
					<div class="relative">
						<svg
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.magnifyingGlass} />
						</svg>
						<input
							type="text"
							placeholder="Title or player name..."
							value={filters.q}
							oninput={handleSearch}
							class="w-full rounded-lg border border-white/10 bg-gray-800/60 py-2 pr-4 pl-9 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 focus:outline-none"
						/>
					</div>
				</div>

				<!-- Sort -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">Sort by</h3>
					<div class="space-y-1">
						{#each [{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }, { value: 'longest', label: 'Longest First' }] as option}
							<button
								onclick={() => updateFilters({ sort: option.value })}
								class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors {filters.sort ===
								option.value
									? 'bg-red-500/10 font-medium text-red-400'
									: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Hero Filter -->
				{#if heroes.length > 0}
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">Hero</h3>
						<select
							value={filters.hero}
							onchange={(e) => updateFilters({ hero: e.target.value || null })}
							class="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 focus:outline-none"
						>
							<option value="">All Heroes</option>
							{#each heroes as h}
								<option value={h}>{h}</option>
							{/each}
						</select>
					</div>
				{/if}

				<!-- Event Filter -->
				{#if events.length > 0}
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">Event</h3>
						<select
							value={filters.event}
							onchange={(e) => updateFilters({ event: e.target.value || null })}
							class="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 focus:outline-none"
						>
							<option value="">All Events</option>
							{#each events as ev}
								<option value={ev.id}>{getEventLabel(ev)}</option>
							{/each}
						</select>
					</div>
				{/if}

				<!-- Clear Filters -->
				{#if activeFilterCount > 0}
					<button
						onclick={clearAllFilters}
						class="rounded-xl border border-white/10 bg-gray-900/50 px-4 py-3 text-sm text-gray-400 transition-colors hover:border-red-500/30 hover:text-red-400"
					>
						Clear all filters
					</button>
				{/if}

				<!-- Premium CTA -->
				{#if !isPremiumUser}
					<div
						class="relative isolate overflow-hidden rounded-xl border border-emerald-500/20 bg-gray-900/50 p-4"
					>
						<div
							class="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl"
						></div>
						<div class="relative">
							<div class="mb-2 flex items-center gap-2">
								<svg class="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
									<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
								</svg>
								<h3 class="text-sm font-semibold text-white">AGE Premium</h3>
							</div>
							<p class="mb-3 text-xs text-gray-400">
								Unlock all tournament VODs and premium content.
							</p>
							<a
								href="/premium"
								class="block rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 py-2 text-center text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-green-500"
							>
								Get Premium
							</a>
						</div>
					</div>
				{/if}

				<!-- Back to Studios -->
				<a
					href="/studios"
					class="group flex items-center gap-3 rounded-xl border border-white/10 bg-gray-900/50 p-3 transition-all hover:border-white/20"
				>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800">
						<svg
							class="h-4 w-4 text-gray-400 transition-colors group-hover:text-white"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowLeft} />
						</svg>
					</div>
					<div class="flex-1">
						<span class="text-sm font-medium text-white">AGE Studios</span>
						<p class="text-xs text-gray-500">Back to all content</p>
					</div>
				</a>
			</div>
		</div>
	</div>
</div>
