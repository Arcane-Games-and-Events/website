<script>
	/**
	 * Decklist Component for displaying FaB decklists
	 * Supports both legacy JSON format and new Strapi component format
	 */

	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';

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

	// State for card hover/modal
	let hoveredCard = null;
	let hoverPosition = { x: 0, y: 0 };
	let cardImageData = {};
	let imageLoaded = false;
	let isMobile = false;
	let showMobileModal = false;
	let mobileCard = null;

	onMount(() => {
		// Detect mobile device
		isMobile =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
			window.innerWidth < 768;
	});

	// Determine if using new or legacy format
	$: isNewFormat = parsedCards && (parsedCards.arenaCards || parsedCards.deckCards);

	// Process cards for new format
	$: processedCards = isNewFormat
		? {
				arena: parsedCards.arenaCards || [],
				deck: groupDeckCardsByColor(parsedCards.deckCards || [])
			}
		: null;

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
		? (parsedCards?.arenaCards?.length || 0) +
			(parsedCards?.deckCards?.reduce((sum, card) => sum + card.quantity, 0) || 0)
		: (decklist.cards || []).reduce((sum, card) => sum + card.quantity, 0);

	// Fetch card data from API (keeps JSON server-side only)
	async function fetchCardData(cardName, cardColor) {
		const cacheKey = `${cardName}_${cardColor}`;
		if (cardImageData[cacheKey]) {
			return cardImageData[cacheKey];
		}

		try {
			const params = new URLSearchParams({ name: cardName });
			if (cardColor) params.append('color', cardColor);
			const response = await fetch(`/api/card?${params}`);
			const data = await response.json();
			cardImageData[cacheKey] = data;
			cardImageData = cardImageData; // Trigger reactivity
			return data;
		} catch (error) {
			console.error('Error fetching card data:', error);
			return { name: cardName, color: cardColor, found: false, image: null };
		}
	}

	// Handle card hover (desktop only)
	async function handleCardHover(event, cardName, cardColor) {
		if (isMobile) return;

		const rect = event.target.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const imageWidth = 250;
		const imageHeight = 350;

		let x = rect.right + 10;
		let y = rect.top;

		if (x + imageWidth > viewportWidth - 20) {
			x = rect.left - imageWidth - 10;
		}

		if (y + imageHeight > viewportHeight - 20) {
			y = viewportHeight - imageHeight - 20;
		}

		if (y < 10) {
			y = 10;
		}

		hoverPosition = { x, y };
		hoveredCard = { name: cardName, color: cardColor };
		imageLoaded = false;

		await fetchCardData(cardName, cardColor);
	}

	function handleCardLeave() {
		if (isMobile) return;
		hoveredCard = null;
		imageLoaded = false;
	}

	// Handle card tap (mobile)
	async function handleCardTap(event, cardName, cardColor) {
		if (!isMobile) return;

		event.preventDefault();
		const data = await fetchCardData(cardName, cardColor);
		mobileCard = { name: cardName, color: cardColor, data };
		showMobileModal = true;
	}

	function closeMobileModal() {
		showMobileModal = false;
		mobileCard = null;
	}

	function handleImageLoad() {
		imageLoaded = true;
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			closeMobileModal();
		}
	}

	/**
	 * Get the formatted search URL for cards.fabtcg.com
	 */
	function getSearchUrl(cardName) {
		const searchQuery = cardName.replace(/\s+/g, '+').toLowerCase();
		return `https://cards.fabtcg.com/results/?q=${searchQuery}`;
	}

	/**
	 * Navigate to card page (mobile)
	 */
	function navigateToCard() {
		if (!mobileCard) return;
		const url = getSearchUrl(mobileCard.name);
		window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative my-6 rounded-lg border border-gray-700 bg-gray-950 p-4 shadow-md">
	<!-- Header with custom deck name and creator -->
	{#if isNewFormat}
		{#if deckName || hero || format}
			<div class="mb-3 border-b border-gray-700 pb-2">
				{#if deckName}
					<h3 class="text-lg leading-tight font-bold text-gray-100">
						{deckName}
						{#if creator}
							<span class="ml-2 text-sm font-normal text-gray-400">by {creator}</span>
						{/if}
					</h3>
				{/if}
				{#if hero || format}
					<div class="mt-1 flex items-center gap-2 text-xs text-gray-400">
						{#if hero}<span class="font-semibold text-gray-300">{hero}</span>{/if}
						{#if hero && format}<span class="text-gray-600">|</span>{/if}
						{#if format}<span class="italic">{format}</span>{/if}
					</div>
				{/if}
			</div>
		{/if}
	{:else if decklist.title}
		<h3 class="mb-3 border-b border-gray-700 pb-2 text-lg font-bold text-gray-100">
			{decklist.title}
		</h3>
	{/if}

	{#if isNewFormat}
		<!-- New Format: Arena Cards as inline list -->
		{#if processedCards.arena && processedCards.arena.length > 0}
			<div class="mb-3">
				<span class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Arena: </span>
				<span class="text-sm text-gray-300">
					{#each processedCards.arena as card, i}
						<button
							type="button"
							class="font-inherit inline cursor-pointer border-0 bg-transparent p-0 text-white transition-colors duration-150 hover:text-blue-400"
							on:mouseenter={(e) => handleCardHover(e, card.name, card.color)}
							on:mouseleave={handleCardLeave}
							on:click={(e) => handleCardTap(e, card.name, card.color)}>{card.name}</button
						>{#if i < processedCards.arena.length - 1}<span class="mx-1 text-gray-600">|</span>{/if}
					{/each}
				</span>
			</div>
		{/if}

		<!-- Deck Cards grouped by color in compact grid -->
		<div class="space-y-2">
			{#each colorOrder as color}
				{#if processedCards.deck[color] && processedCards.deck[color].length > 0}
					<div>
						<div class="mb-1 flex items-center gap-2">
							<span
								class="rounded px-1.5 py-0.5 text-xs font-semibold tracking-wider uppercase {color ===
								'red'
									? 'bg-red-500/20 text-red-400'
									: color === 'yellow'
										? 'bg-yellow-500/20 text-yellow-300'
										: color === 'blue'
											? 'bg-blue-500/20 text-blue-400'
											: 'bg-gray-500/20 text-gray-400'}">{colorLabels[color]}</span
							>
							<span class="text-xs text-gray-500"
								>({processedCards.deck[color].reduce((sum, c) => sum + c.quantity, 0)})</span
							>
						</div>
						<div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm md:grid-cols-3 lg:grid-cols-4">
							{#each processedCards.deck[color] as card}
								<div class="flex min-w-0 items-baseline gap-1">
									<span class="shrink-0 text-xs text-gray-500">{card.quantity}x</span>
									<button
										type="button"
										class="font-inherit cursor-pointer truncate border-0 bg-transparent p-0 text-left text-gray-200 transition-colors duration-150 hover:text-blue-400"
										on:mouseenter={(e) => handleCardHover(e, card.name, card.color)}
										on:mouseleave={handleCardLeave}
										on:click={(e) => handleCardTap(e, card.name, card.color)}
										title={card.name}>{card.name}</button
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
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each sortedTypes as type}
				{#if groupedCards[type] && groupedCards[type].length > 0}
					<div class="min-w-0">
						<h4 class="mb-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">
							{typeLabels[type] || type}
						</h4>
						<div class="space-y-0.5 text-sm">
							{#each groupedCards[type] as card}
								<div class="flex items-baseline gap-1">
									<span class="shrink-0 text-xs text-gray-500">{card.quantity}x</span>
									<a
										href={card.url ||
											`https://cards.fabtcg.com/?search=${encodeURIComponent(card.id || card.name)}`}
										target="_blank"
										rel="noopener noreferrer"
										data-card-name={card.id || card.name}
										class="cursor-pointer truncate text-gray-200 no-underline transition-colors duration-150 hover:text-blue-400"
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

	{#if totalCards > 0}
		<div
			class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-2 text-xs"
		>
			<span class="text-gray-400">{totalCards} cards</span>
			{#if fabraryUrl}
				<a
					href={fabraryUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-blue-400 no-underline transition-colors duration-150 hover:text-blue-300"
				>
					View on FaBrary →
				</a>
			{/if}
		</div>
	{/if}
</div>

<!-- Desktop Card Preview (Hover) -->
{#if hoveredCard && !isMobile}
	{@const cacheKey = `${hoveredCard.name}_${hoveredCard.color}`}
	{@const cardData = cardImageData[cacheKey]}
	<div
		class="pointer-events-none fixed z-[1000]"
		style="left: {hoverPosition.x}px; top: {hoverPosition.y}px;"
		transition:fade={{ duration: 150 }}
	>
		<div class="relative">
			<!-- Subtle placeholder - shows immediately -->
			<div
				class="h-[350px] w-[250px] rounded-lg border border-gray-800/50 bg-gray-900/80 shadow-xl transition-opacity duration-200 {imageLoaded ? 'opacity-0' : 'opacity-100'}"
			></div>
			<!-- Actual card image - fades in when loaded -->
			{#if cardData?.image}
				<img
					src={cardData.image}
					alt={hoveredCard.name}
					loading="lazy"
					decoding="async"
					on:load={handleImageLoad}
					class="absolute top-0 left-0 w-[250px] rounded-lg border border-gray-700 shadow-2xl transition-opacity duration-200 {imageLoaded
						? 'opacity-100'
						: 'opacity-0'}"
				/>
			{/if}
		</div>
	</div>
{/if}

<!-- Mobile Card Modal (Tap) -->
{#if showMobileModal && mobileCard}
	<div
		class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm"
		role="button"
		tabindex="0"
		on:click={closeMobileModal}
		on:keydown={(e) => e.key === 'Escape' && closeMobileModal()}
		transition:fade={{ duration: 200 }}
	>
		<div
			class="relative max-h-[90%] max-w-[90%]"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label="Card preview"
			on:click|stopPropagation
			on:keydown|stopPropagation
			transition:scale={{ duration: 200, start: 0.9 }}
		>
			<button
				class="absolute -top-3 -right-3 z-[1] flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-white/95 text-black shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all duration-200 hover:scale-110 hover:bg-white active:scale-95"
				on:click={closeMobileModal}
				aria-label="Close card preview"
			>
				<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
			{#if mobileCard.data?.image}
				<img
					src={mobileCard.data.image}
					alt="Card preview"
					loading="lazy"
					decoding="async"
					class="h-auto w-full max-w-[350px] rounded-2xl border-[3px] border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
				/>
			{:else}
				<div
					class="flex h-[490px] w-[350px] items-center justify-center rounded-2xl border-[3px] border-white/20 bg-gray-800"
				>
					<span class="text-gray-500">Image not available</span>
				</div>
			{/if}
			<button
				class="mt-4 flex w-full max-w-[350px] cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-white/95 p-3 px-6 text-[15px] font-semibold text-black shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] active:translate-y-0"
				on:click={navigateToCard}
			>
				<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
					/>
				</svg>
				View Full Card
			</button>
			<p class="mt-2 text-center text-white/50" style="font-size: 10px; line-height: 1.2;">Tap outside to close</p>
		</div>
	</div>
{/if}
