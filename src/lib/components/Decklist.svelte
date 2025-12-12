<script>
	/**
	 * Decklist Component for displaying FaB decklists
	 * Supports both legacy JSON format and new Strapi component format
	 */

	// Props - supports both old and new formats
	/** @type {{ title?: string, cards?: Array<{quantity: number, name: string, type?: string}> }} */
	export let decklist = { cards: [] };

	// New format props from Strapi
	export let deckName = null;
	export let creator = null;
	export let hero = null;
	export let format = null;
	export let parsedCards = null;
	export let fabraryUrl = null;

	// Card images map from server for hover tooltips
	export let cardImages = {};

	// Determine if using new or legacy format
	$: isNewFormat = parsedCards && (parsedCards.arenaCards || parsedCards.deckCards);

	// Process cards for new format
	$: processedCards = isNewFormat
		? {
				arena: groupArenaCards(parsedCards.arenaCards || []),
				deck: groupDeckCardsByColor(parsedCards.deckCards || [])
			}
		: null;

	// Group arena cards by name to show quantities
	function groupArenaCards(arenaCards) {
		const grouped = {};
		arenaCards.forEach((card) => {
			const key = card.name;
			const cardQty = card.quantity || 1;
			if (!grouped[key]) {
				grouped[key] = { ...card, quantity: cardQty };
			} else {
				grouped[key].quantity += cardQty;
			}
		});
		return Object.values(grouped);
	}

	// Group cards by type (legacy format)
	$: groupedCards = isNewFormat
		? {}
		: (decklist.cards || []).reduce((acc, card) => {
				const type = card.type || 'card';
				if (!acc[type]) {
					acc[type] = [];
				}
				acc[type].push(card);
				return acc;
			}, {});

	// Group deck cards by color for new format
	function groupDeckCardsByColor(deckCards) {
		return deckCards.reduce((acc, card) => {
			const color = card.color || 'colorless';
			if (!acc[color]) {
				acc[color] = [];
			}
			acc[color].push(card);
			return acc;
		}, {});
	}

	// Define type order for display (legacy)
	const typeOrder = [
		'hero',
		'weapon',
		'equipment',
		'card',
		'action',
		'attack',
		'defense',
		'resource'
	];
	const typeLabels = {
		hero: 'Hero',
		weapon: 'Weapons',
		equipment: 'Equipment',
		card: 'Cards',
		action: 'Actions',
		attack: 'Attack Actions',
		defense: 'Defense Reactions',
		resource: 'Resources'
	};

	// Color labels and order
	const colorOrder = ['red', 'yellow', 'blue', 'colorless'];
	const colorLabels = {
		red: 'Red',
		yellow: 'Yellow',
		blue: 'Blue',
		colorless: 'Colorless'
	};

	// Sort types according to predefined order (legacy)
	$: sortedTypes = Object.keys(groupedCards).sort((a, b) => {
		const aIndex = typeOrder.indexOf(a);
		const bIndex = typeOrder.indexOf(b);
		if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
		if (aIndex === -1) return 1;
		if (bIndex === -1) return -1;
		return aIndex - bIndex;
	});

	// Calculate total cards
	$: totalCards = isNewFormat
		? (parsedCards?.arenaCards?.reduce((sum, card) => sum + (card.quantity || 1), 0) || 0) +
			(parsedCards?.deckCards?.reduce((sum, card) => sum + card.quantity, 0) || 0)
		: (decklist.cards || []).reduce((sum, card) => sum + card.quantity, 0);

	/**
	 * Get the formatted search URL for cards.fabtcg.com
	 */
	function getSearchUrl(cardName) {
		const searchQuery = cardName.replace(/\s+/g, '+').toLowerCase();
		return `https://cards.fabtcg.com/results/?q=${searchQuery}`;
	}

	/**
	 * Convert color to pitch value for data attribute
	 */
	function colorToPitch(color) {
		if (color === 'red') return '1';
		if (color === 'yellow') return '2';
		if (color === 'blue') return '3';
		return null;
	}

	/**
	 * Convert color to pitch letter for card image lookup
	 */
	function colorToPitchLetter(color) {
		if (color === 'red') return 'r';
		if (color === 'yellow') return 'y';
		if (color === 'blue') return 'b';
		return null;
	}

	/**
	 * Look up card image from the server-provided cardImages map
	 */
	function getCardImage(cardName, pitchLetter) {
		if (!cardImages || Object.keys(cardImages).length === 0) return null;
		const normalizedName = cardName.toLowerCase();
		const pitchKey = pitchLetter ? `${normalizedName}:${pitchLetter}` : null;

		// Try pitch-specific key first
		if (pitchKey && cardImages[pitchKey]) {
			return cardImages[pitchKey];
		}

		// Fall back to base name
		if (cardImages[normalizedName]) {
			return cardImages[normalizedName];
		}

		return null;
	}
</script>

<div
	class="relative my-8 overflow-hidden rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl"
>
	<!-- Header with custom deck name and creator -->
	{#if isNewFormat}
		{#if deckName || hero || format}
			<div
				class="border-b border-white/10 bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-transparent px-5 py-3"
			>
				{#if deckName}
					<h3 class="text-base leading-tight font-bold text-white">
						{deckName}
						{#if creator}
							<span class="ml-2 text-sm font-normal text-gray-400">by {creator}</span>
						{/if}
					</h3>
				{/if}
				{#if hero || format}
					<div class="mt-1 flex items-center gap-2 text-xs">
						{#if hero}
							<span class="font-medium text-gray-300">{hero}</span>
						{/if}
						{#if hero && format}
							<span class="text-gray-600">·</span>
						{/if}
						{#if format}
							<span class="text-blue-400">{format}</span>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	{:else if decklist.title}
		<div
			class="border-b border-white/10 bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-transparent px-5 py-3"
		>
			<h3 class="text-base font-bold text-white">
				{decklist.title}
			</h3>
		</div>
	{/if}

	<div class="p-5">
		{#if isNewFormat}
			<!-- New Format: Arena Cards as inline list -->
			{#if processedCards.arena && processedCards.arena.length > 0}
				<div class="mb-5 rounded-xl bg-white/5 p-4">
					<div class="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">Arena</div>
					<div class="flex flex-wrap gap-2">
						{#each processedCards.arena as card}
							{@const arenaCardImg = getCardImage(card.name, null)}
							<a
								href={getSearchUrl(card.name)}
								target="_blank"
								rel="noopener noreferrer"
								data-card-name={card.name}
								data-card-image={arenaCardImg?.imageUrl || null}
								data-card-fallback={arenaCardImg?.fallbackUrl || null}
								class="card-link rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm !text-white !no-underline transition-all duration-150 hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:!text-yellow-300"
							>
								{#if card.quantity > 1}<span class="mr-1 text-gray-400">{card.quantity}×</span>{/if}{card.name}
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Deck Cards grouped by color -->
			<div class="space-y-5">
				{#each colorOrder as color}
					{#if processedCards.deck[color] && processedCards.deck[color].length > 0}
						<div>
							<!-- Full-width color header with fading gradient -->
							<div
								class="-mx-5 mb-3 px-5 py-2 bg-gradient-to-r {color === 'red'
									? 'from-red-500/25 via-red-500/10 to-transparent'
									: color === 'yellow'
										? 'from-yellow-500/25 via-yellow-500/10 to-transparent'
										: color === 'blue'
											? 'from-blue-500/25 via-blue-500/10 to-transparent'
											: 'from-gray-500/25 via-gray-500/10 to-transparent'}"
							>
								<span
									class="text-sm font-semibold {color === 'red'
										? 'text-red-400'
										: color === 'yellow'
											? 'text-yellow-300'
											: color === 'blue'
												? 'text-blue-400'
												: 'text-gray-400'}"
								>
									{colorLabels[color]}
									<span class="ml-2 font-normal text-gray-400">
										— <span class="font-medium text-white/70">{processedCards.deck[color].reduce((sum, c) => sum + c.quantity, 0)}</span> cards
									</span>
								</span>
							</div>
							<div class="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 md:grid-cols-3">
								{#each processedCards.deck[color] as card}
									{@const deckCardImg = getCardImage(card.name, colorToPitchLetter(color))}
									<div class="flex min-w-0 items-baseline gap-2">
										<span class="w-5 shrink-0 text-right text-xs font-medium text-gray-500"
											>{card.quantity}×</span
										>
										<a
											href={getSearchUrl(card.name)}
											target="_blank"
											rel="noopener noreferrer"
											data-card-name={card.name}
											data-card-pitch={colorToPitch(color)}
											data-card-image={deckCardImg?.imageUrl || null}
											data-card-fallback={deckCardImg?.fallbackUrl || null}
											class="card-link truncate !text-white !underline !decoration-white/40 transition-colors duration-150 hover:!text-yellow-400 hover:!decoration-yellow-400/60"
											title={card.name}>{card.name}</a
										>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{:else}
			<!-- Legacy Format: Cards grouped by type in compact grid -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each sortedTypes as type}
					{#if groupedCards[type] && groupedCards[type].length > 0}
						<div class="min-w-0">
							<h4 class="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
								{typeLabels[type] || type}
							</h4>
							<div class="space-y-1 text-sm">
								{#each groupedCards[type] as card}
									{@const legacyCardImg = getCardImage(card.name, null)}
									<div class="flex items-baseline gap-2">
										<span class="w-5 shrink-0 text-right text-xs font-medium text-gray-500"
											>{card.quantity}×</span
										>
										<a
											href={card.url ||
												`https://cards.fabtcg.com/results/?q=${encodeURIComponent(card.id || card.name)}`}
											target="_blank"
											rel="noopener noreferrer"
											data-card-name={card.name}
											data-card-image={legacyCardImg?.imageUrl || null}
											data-card-fallback={legacyCardImg?.fallbackUrl || null}
											class="card-link truncate !text-white !underline !decoration-white/40 transition-colors duration-150 hover:!text-yellow-400 hover:!decoration-yellow-400/60"
											title={card.name}>{card.name}</a
										>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- Footer -->
	{#if totalCards > 0 || fabraryUrl}
		<div
			class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-gray-800/30 px-5 py-3"
		>
			<span class="text-sm text-gray-400">
				<span class="font-semibold text-white">{totalCards}</span> cards
			</span>
			{#if fabraryUrl}
				<a
					href={fabraryUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 text-sm font-medium text-yellow-400 no-underline transition-colors duration-150 hover:text-yellow-300"
				>
					View on FaBrary
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
						/>
					</svg>
				</a>
			{/if}
		</div>
	{/if}
</div>
