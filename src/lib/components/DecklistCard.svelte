<script>
	/**
	 * DecklistCard - Reusable decklist card component with hero image background
	 * Used in FeaturedDecklists and player profile Tournament Decklists
	 */
	import { getCircuit } from '$lib/data/circuits.js';

	let {
		decklist,
		eventId = null,
		eventName = null,
		eventCircuit = null,
		showPlayerName = true,
		showEventName = true,
		showCardCount = false
	} = $props();

	// Hero color mapping based on hero class/talent
	const heroColors = {
		// Ninja - Red/Orange
		'Fai': { gradient: 'from-red-500/30 to-orange-500/30' },
		'Katsu': { gradient: 'from-red-500/30 to-orange-500/30' },
		'Zen': { gradient: 'from-red-500/30 to-orange-500/30' },
		// Ice/Wizard - Blue/Cyan
		'Iyslander': { gradient: 'from-blue-500/30 to-cyan-500/30' },
		'Kano': { gradient: 'from-purple-500/30 to-pink-500/30' },
		// Brute - Green/Brown
		'Rhinar': { gradient: 'from-green-600/30 to-lime-500/30' },
		'Kayo': { gradient: 'from-green-600/30 to-lime-500/30' },
		// Guardian - Blue/Gray
		'Bravo': { gradient: 'from-blue-600/30 to-slate-500/30' },
		'Oldhim': { gradient: 'from-cyan-500/30 to-blue-500/30' },
		'Victor': { gradient: 'from-yellow-500/30 to-amber-500/30' },
		// Warrior - Yellow/Gold
		'Dorinthea': { gradient: 'from-yellow-500/30 to-amber-500/30' },
		'Kassai': { gradient: 'from-yellow-500/30 to-amber-500/30' },
		'Olympia': { gradient: 'from-yellow-500/30 to-amber-500/30' },
		// Mechanologist - Orange/Steel
		'Dash': { gradient: 'from-orange-500/30 to-amber-500/30' },
		'Maxx': { gradient: 'from-orange-500/30 to-amber-500/30' },
		'Teklovossen': { gradient: 'from-orange-500/30 to-amber-500/30' },
		// Ranger - Green/Teal
		'Azalea': { gradient: 'from-emerald-500/30 to-teal-500/30' },
		'Lexi': { gradient: 'from-emerald-500/30 to-cyan-500/30' },
		// Runeblade - Purple/Violet
		'Viserai': { gradient: 'from-violet-500/30 to-purple-500/30' },
		'Chane': { gradient: 'from-purple-600/30 to-gray-500/30' },
		'Vynnset': { gradient: 'from-purple-600/30 to-gray-500/30' },
		// Illusionist - Yellow/Light
		'Prism': { gradient: 'from-yellow-400/30 to-white/20' },
		'Dromai': { gradient: 'from-red-500/30 to-orange-500/30' },
		'Enigma': { gradient: 'from-indigo-500/30 to-purple-500/30' },
		// Shadow - Gray/Dark
		'Levia': { gradient: 'from-gray-600/30 to-purple-600/30' },
		'Arakni': { gradient: 'from-gray-600/30 to-green-600/30' },
		'Uzuri': { gradient: 'from-gray-600/30 to-purple-500/30' },
		'Nuu': { gradient: 'from-pink-500/30 to-purple-500/30' },
		// Earth - Brown/Green
		'Briar': { gradient: 'from-emerald-600/30 to-green-500/30' },
		'Florian': { gradient: 'from-emerald-600/30 to-green-500/30' },
		'Verdance': { gradient: 'from-emerald-600/30 to-green-500/30' },
		// Lightning - Yellow/Electric
		'Aurora': { gradient: 'from-yellow-400/30 to-cyan-400/30' },
		// Default
		'default': { gradient: 'from-gray-500/30 to-slate-500/30' }
	};

	function getHeroColor(heroName) {
		if (!heroName) return heroColors.default;
		const firstName = heroName.split(',')[0].trim();
		return heroColors[firstName] || heroColors.default;
	}

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
		if (placement === 1) return '1st Place';
		if (placement === 2) return '2nd Place';
		if (placement === 3) return '3rd Place';
		return `Top ${placement}`;
	}

	// Computed values
	const heroColor = $derived(getHeroColor(decklist.hero));
	const heroImage = $derived(getHeroImage(decklist.hero));
	const circuit = $derived(getCircuit(eventCircuit || decklist.eventCircuit));
	const resolvedEventId = $derived(eventId || decklist.eventId);
	const resolvedEventName = $derived(eventName || decklist.eventName);
	const resolvedEventCircuit = $derived(eventCircuit || decklist.eventCircuit);

	// Card count calculation
	const totalCards = $derived(
		showCardCount && decklist.cards && Array.isArray(decklist.cards)
			? decklist.cards.reduce((sum, c) => sum + (c.quantity || 0), 0)
			: 0
	);
</script>

<a
	href="/age-open/{resolvedEventId}/decklist/{decklist.id}"
	class="group relative flex h-40 flex-col overflow-hidden rounded-xl shadow-lg shadow-black/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/50 hover:scale-[1.02]"
>
	<!-- Hero Image Background -->
	<div class="absolute inset-0">
		{#if heroImage}
			<img
				src={heroImage}
				alt={decklist.hero}
				class="h-full w-full object-cover object-right transition-transform duration-500 group-hover:scale-110"
				loading="lazy"
			/>
		{:else}
			<div class="h-full w-full bg-gradient-to-br {heroColor.gradient}"></div>
		{/if}
		<!-- Gradient Overlay -->
		<div class="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent"></div>
		<div class="absolute inset-0 bg-gradient-to-r from-gray-950/60 to-transparent"></div>
	</div>

	<!-- Placement Badge -->
	{#if decklist.placement}
		<div class="absolute top-3 right-3">
			<div class="flex items-center gap-1 rounded-full bg-yellow-500/90 px-2 py-0.5 text-[10px] font-bold text-gray-900 shadow-lg">
				<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
				</svg>
				{formatPlacement(decklist.placement)}
			</div>
		</div>
	{/if}

	<!-- Circuit Indicator -->
	{#if resolvedEventCircuit}
		<div class="absolute top-3 left-3">
			<div class="flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
				<span class="h-2 w-2 rounded-full {circuit.colors.bg}"></span>
				<span class="text-[10px] font-medium text-white/90">{resolvedEventCircuit}</span>
			</div>
		</div>
	{/if}

	<!-- Content -->
	<div class="relative mt-auto p-4">
		<h4 class="truncate text-base font-bold text-white drop-shadow-lg">
			{decklist.hero || 'Unknown Hero'}
		</h4>
		<p class="mt-0.5 text-xs text-gray-300">
			{decklist.format || 'Classic Constructed'}
			{#if showCardCount && totalCards > 0}
				<span class="text-gray-500">• {totalCards} cards</span>
			{/if}
		</p>
		<div class="mt-2 flex items-center justify-between">
			{#if showPlayerName && decklist.playerName}
				<p class="truncate text-xs text-gray-400">
					<span class="text-white/80">{decklist.playerName}</span>
				</p>
			{:else}
				<span></span>
			{/if}
			{#if showEventName && resolvedEventName}
				<p class="shrink-0 text-[10px] text-gray-500">
					{resolvedEventName}
				</p>
			{/if}
		</div>
	</div>
</a>
