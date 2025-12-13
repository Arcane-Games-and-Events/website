<script>
	/**
	 * DecklistCard - Reusable decklist card component matching EventCard style
	 * Used in FeaturedDecklists and player profile Tournament Decklists
	 */
	import { getCircuit } from '$lib/data/circuits.js';

	let {
		decklist,
		eventId = null,
		eventCircuit = null,
		showPlayerName = true,
		showCardCount = false
	} = $props();

	function getHeroImage(heroName) {
		if (!heroName) return null;
		const slug = heroName
			.toLowerCase()
			.replace(/,/g, '')
			.replace(/\s+/g, '-')
			.replace(/['"]/g, '')
			.replace(/--+/g, '-');
		return `/hero_images/${slug}.webp`;
	}

	function formatPlacement(placement) {
		if (placement === 1) return '1st';
		if (placement === 2) return '2nd';
		if (placement === 3) return '3rd';
		return `#${placement}`;
	}

	// Computed values
	const heroImage = $derived(getHeroImage(decklist.hero));
	const circuit = $derived(getCircuit(eventCircuit || decklist.eventCircuit));
	const resolvedEventId = $derived(eventId || decklist.eventId);
	const resolvedEventCircuit = $derived(eventCircuit || decklist.eventCircuit);

	// Card count calculation
	const totalCards = $derived(
		showCardCount && decklist.cards && Array.isArray(decklist.cards)
			? decklist.cards.reduce((sum, c) => sum + (c.quantity || 0), 0)
			: 0
	);
</script>

<a href="/age-open/{resolvedEventId}/decklist/{decklist.id}" class="group block">
	<div
		class="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80 transition-all hover:border-gray-700"
	>
		<!-- Solid background on left -->
		<div class="absolute inset-0 bg-gray-900"></div>

		<!-- Hero Image on right half only -->
		<div class="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
			{#if heroImage}
				<img
					src={heroImage}
					alt={decklist.hero}
					class="h-full w-full object-cover object-top opacity-60 transition-transform duration-500 group-hover:scale-105"
					loading="lazy"
				/>
			{/if}
			<!-- Fade to solid on left edge -->
			<div
				class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/70 to-gray-900/30"
			></div>
		</div>

		<!-- Mobile Layout (compact single row) -->
		<div class="relative z-10 flex items-center gap-2 p-2 sm:hidden">
			<!-- Placement Block -->
			{#if decklist.placement}
				<div
					class="flex w-11 shrink-0 flex-col items-center justify-center rounded-md bg-yellow-500/20 py-1.5 backdrop-blur-sm"
				>
					<svg class="h-3 w-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"
						/>
					</svg>
					<span class="text-sm font-bold text-yellow-400"
						>{formatPlacement(decklist.placement)}</span
					>
				</div>
			{:else}
				<div
					class="flex w-11 shrink-0 flex-col items-center justify-center rounded-md {circuit.colors
						.bgLight} py-1.5 backdrop-blur-sm"
				>
					<span class="h-3 w-3 rounded-full {circuit.colors.bg}"></span>
				</div>
			{/if}

			<!-- Hero & Details -->
			<div class="min-w-0 flex-1">
				<h4 class="truncate text-xs font-semibold text-white">{decklist.hero || 'Unknown Hero'}</h4>
				<div class="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
					{#if showPlayerName && decklist.playerName}
						<span class="truncate text-white/80">{decklist.playerName}</span>
						<span>·</span>
					{/if}
					<span>{decklist.format || 'CC'}</span>
				</div>
			</div>
		</div>

		<!-- Desktop Layout (horizontal) -->
		<div class="relative z-10 hidden sm:flex">
			<!-- Placement/Circuit Block -->
			{#if decklist.placement}
				<div
					class="flex w-20 shrink-0 flex-col items-center justify-center border-r border-gray-800/50 bg-yellow-500/10 px-3 py-3 backdrop-blur-sm"
				>
					<svg class="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"
						/>
					</svg>
					<span class="text-lg font-bold text-yellow-400"
						>{formatPlacement(decklist.placement)}</span
					>
					<span class="text-[10px] text-yellow-500/70">Place</span>
				</div>
			{:else}
				<div
					class="flex w-20 shrink-0 flex-col items-center justify-center border-r border-gray-800/50 {circuit
						.colors.bgLight} px-3 py-3 backdrop-blur-sm"
				>
					<span class="h-4 w-4 rounded-full {circuit.colors.bg}"></span>
					<span class="mt-1 text-[10px] font-medium {circuit.colors.text}"
						>{circuit.abbreviation}</span
					>
				</div>
			{/if}

			<!-- Main Content -->
			<div class="flex min-w-0 flex-1 items-center gap-4 px-4 py-3">
				<!-- Decklist Details -->
				<div class="min-w-0 flex-1">
					<!-- Hero Name -->
					<h4
						class="truncate text-sm font-semibold text-white transition-colors group-hover:text-blue-400"
					>
						{decklist.hero || 'Unknown Hero'}
					</h4>

					<!-- Key Details Row -->
					<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
						<!-- Circuit -->
						<div class="flex items-center gap-1.5">
							<span class="h-2 w-2 rounded-full {circuit.colors.bg}"></span>
							<span class="{circuit.colors.text} font-medium"
								>{resolvedEventCircuit || 'AGE Open'}</span
							>
						</div>

						<!-- Format -->
						<div class="flex items-center gap-1.5 text-gray-400">
							<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
								/>
							</svg>
							<span>{decklist.format || 'Classic Constructed'}</span>
							{#if showCardCount && totalCards > 0}
								<span class="text-gray-500">• {totalCards} cards</span>
							{/if}
						</div>

						<!-- Player Name -->
						{#if showPlayerName && decklist.playerName}
							<div class="flex items-center gap-1.5 text-gray-500">
								<svg
									class="h-3.5 w-3.5 shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
									/>
								</svg>
								<span class="max-w-[150px] truncate">{decklist.playerName}</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</a>
