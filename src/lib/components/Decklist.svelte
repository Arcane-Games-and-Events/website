<script>
	/**
	 * Decklist Component for displaying FaB decklists
	 * Supports both legacy JSON format and new Strapi component format
	 */

	import { onMount } from 'svelte';
	import { getCardData } from '$lib/utils/card-lookup.js';

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

	// State for card hover
	let hoveredCard = null;
	let hoverPosition = { x: 0, y: 0 };
	let cardImageData = {};

	// Determine if using new or legacy format
	$: isNewFormat = parsedCards && (parsedCards.arenaCards || parsedCards.deckCards);

	// Process cards for new format
	$: processedCards = isNewFormat ? {
		arena: parsedCards.arenaCards || [],
		deck: groupDeckCardsByColor(parsedCards.deckCards || [])
	} : null;

	// Group cards by type (legacy format)
	$: groupedCards = isNewFormat ? {} : (decklist.cards || []).reduce((acc, card) => {
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
	const typeOrder = ['hero', 'weapon', 'equipment', 'card', 'action', 'attack', 'defense', 'resource'];
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
		? (parsedCards?.arenaCards?.length || 0) +
		  (parsedCards?.deckCards?.reduce((sum, card) => sum + card.quantity, 0) || 0)
		: (decklist.cards || []).reduce((sum, card) => sum + card.quantity, 0);

	// Handle card hover
	function handleCardHover(event, cardName, cardColor) {
		const rect = event.target.getBoundingClientRect();
		hoverPosition = {
			x: rect.right + 10,
			y: rect.top
		};

		hoveredCard = { name: cardName, color: cardColor };

		// Fetch card data if not cached
		const cacheKey = `${cardName}_${cardColor}`;
		if (!cardImageData[cacheKey]) {
			const data = getCardData(cardName, cardColor);
			cardImageData[cacheKey] = data;
		}
	}

	function handleCardLeave() {
		hoveredCard = null;
	}
</script>

<div class="bg-gray-950 border border-gray-700 rounded-lg p-6 my-8 shadow-md relative">
	<!-- Header with custom deck name and creator -->
	{#if isNewFormat}
		{#if deckName}
			<h3 class="text-2xl font-bold text-gray-100 mb-2 pb-3 border-b-2 border-gray-700">
				{deckName}
				{#if creator}
					<span class="text-lg font-normal text-gray-400 ml-2">by {creator}</span>
				{/if}
			</h3>
		{/if}
		{#if hero || format}
			<div class="flex items-center gap-2 mb-6 text-sm text-gray-400">
				{#if hero}<span class="font-semibold text-gray-300">{hero}</span>{/if}
				{#if hero && format}<span class="text-gray-600">•</span>{/if}
				{#if format}<span class="italic">{format}</span>{/if}
			</div>
		{/if}
	{:else if decklist.title}
		<h3 class="text-2xl font-bold text-gray-100 mb-2 pb-3 border-b-2 border-gray-700">{decklist.title}</h3>
	{/if}

	<div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
		{#if isNewFormat}
			<!-- New Format: Arena Cards + Deck Cards grouped by color -->
			{#if processedCards.arena && processedCards.arena.length > 0}
				<div class="min-w-0">
					<h4 class="text-base font-semibold text-gray-400 uppercase tracking-wider mb-3 pb-2 border-b border-gray-700">Arena Cards</h4>
					<ul class="list-none p-0 m-0">
						{#each processedCards.arena as card}
							<li class="flex items-baseline gap-2 py-1 text-sm">
								<span class="font-semibold text-gray-400 min-w-[2rem] text-right">{card.quantity}x</span>
								<span
									class="text-white cursor-pointer transition-colors duration-200 hover:text-blue-500 hover:underline"
									on:mouseenter={(e) => handleCardHover(e, card.name, card.color)}
									on:mouseleave={handleCardLeave}
									role="link"
									tabindex="0"
								>
									{card.name}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Deck Cards grouped by color -->
			<div class="min-w-0 col-span-full">
				<h4 class="text-base font-semibold text-gray-400 uppercase tracking-wider mb-3 pb-2 border-b border-gray-700">Deck Cards</h4>
				{#each colorOrder as color}
					{#if processedCards.deck[color] && processedCards.deck[color].length > 0}
						<div class="mb-6">
							<h5 class="text-sm font-semibold uppercase tracking-wider mb-2 p-2 rounded {color === 'red' ? 'bg-red-500/10 text-red-300' : color === 'yellow' ? 'bg-yellow-500/10 text-yellow-200' : color === 'blue' ? 'bg-blue-500/10 text-blue-300' : 'bg-gray-500/10 text-gray-300'}">{colorLabels[color]} ({processedCards.deck[color].reduce((sum, c) => sum + c.quantity, 0)})</h5>
							<ul class="list-none p-0 m-0">
								{#each processedCards.deck[color] as card}
									<li class="flex items-baseline gap-2 py-1 text-sm">
										<span class="font-semibold text-gray-400 min-w-[2rem] text-right">{card.quantity}x</span>
										<span
											class="text-white cursor-pointer transition-colors duration-200 hover:text-blue-500 hover:underline"
											on:mouseenter={(e) => handleCardHover(e, card.name, card.color)}
											on:mouseleave={handleCardLeave}
											role="link"
											tabindex="0"
										>
											{card.name}
										</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/each}
			</div>
		{:else}
			<!-- Legacy Format: Cards grouped by type -->
			{#each sortedTypes as type}
				{#if groupedCards[type] && groupedCards[type].length > 0}
					<div class="min-w-0">
						<h4 class="text-base font-semibold text-gray-400 uppercase tracking-wider mb-3 pb-2 border-b border-gray-700">{typeLabels[type] || type}</h4>
						<ul class="list-none p-0 m-0">
							{#each groupedCards[type] as card}
								<li class="flex items-baseline gap-2 py-1 text-sm">
									<span class="font-semibold text-gray-400 min-w-[2rem] text-right">{card.quantity}</span>
									<a
										href={card.url || `https://cards.fabtcg.com/?search=${encodeURIComponent(card.id || card.name)}`}
										target="_blank"
										rel="noopener noreferrer"
										data-card-name={card.id || card.name}
										class="text-white no-underline cursor-pointer transition-colors duration-200 hover:text-blue-500 hover:underline"
									>
										{card.name}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/each}
		{/if}

		{#if totalCards > 0}
			<div class="col-span-full pt-4 mt-4 border-t border-gray-700 flex justify-between items-center flex-wrap gap-4">
				<span class="font-semibold text-gray-100 text-sm">Total: {totalCards} cards</span>
				{#if fabraryUrl}
					<a href={fabraryUrl} target="_blank" rel="noopener noreferrer" class="text-blue-300 no-underline text-sm font-medium transition-colors duration-200 hover:text-blue-400 hover:underline">
						View on FaBrary →
					</a>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Card Hover Tooltip -->
{#if hoveredCard}
	{@const cacheKey = `${hoveredCard.name}_${hoveredCard.color}`}
	{@const cardData = cardImageData[cacheKey]}
	{#if cardData && cardData.image}
		<div
			class="fixed z-[1000] pointer-events-none drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] md:hidden"
			style="left: {hoverPosition.x}px; top: {hoverPosition.y}px;"
		>
			<img src={cardData.image} alt={hoveredCard.name} class="max-w-[300px] max-h-[420px] rounded-lg border-2 border-gray-700" />
		</div>
	{/if}
{/if}
