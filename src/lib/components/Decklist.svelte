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
							<button
								type="button"
								class="font-inherit cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-all duration-150 hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-300"
								on:mouseenter={(e) => handleCardHover(e, card.name, card.color)}
								on:mouseleave={handleCardLeave}
								on:click={(e) => handleCardTap(e, card.name, card.color)}
								>{#if card.quantity > 1}<span class="mr-1 text-gray-400">{card.quantity}×</span
									>{/if}{card.name}</button
							>
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
									<div class="flex min-w-0 items-baseline gap-2">
										<span class="w-5 shrink-0 text-right text-xs font-medium text-gray-500"
											>{card.quantity}×</span
										>
										<button
											type="button"
											class="font-inherit cursor-pointer truncate border-0 bg-transparent p-0 text-left text-gray-300 transition-colors duration-150 hover:text-yellow-400"
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
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each sortedTypes as type}
					{#if groupedCards[type] && groupedCards[type].length > 0}
						<div class="min-w-0">
							<h4 class="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
								{typeLabels[type] || type}
							</h4>
							<div class="space-y-1 text-sm">
								{#each groupedCards[type] as card}
									<div class="flex items-baseline gap-2">
										<span class="w-5 shrink-0 text-right text-xs font-medium text-gray-500"
											>{card.quantity}×</span
										>
										<a
											href={card.url ||
												`https://cards.fabtcg.com/?search=${encodeURIComponent(card.id || card.name)}`}
											target="_blank"
											rel="noopener noreferrer"
											data-card-name={card.id || card.name}
											class="cursor-pointer truncate text-gray-300 no-underline transition-colors duration-150 hover:text-yellow-400"
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
				class="h-[350px] w-[250px] rounded-xl border border-white/10 bg-gray-900/90 shadow-2xl transition-opacity duration-200 {imageLoaded
					? 'opacity-0'
					: 'opacity-100'}"
			></div>
			<!-- Actual card image - fades in when loaded -->
			{#if cardData?.image}
				<img
					src={cardData.image}
					alt={hoveredCard.name}
					loading="lazy"
					decoding="async"
					on:load={handleImageLoad}
					class="absolute top-0 left-0 w-[250px] rounded-xl border border-white/20 shadow-2xl transition-opacity duration-200 {imageLoaded
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
		class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-5 backdrop-blur-md"
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
				class="absolute -top-3 -right-3 z-[1] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-gray-900 text-white shadow-xl transition-all duration-200 hover:bg-gray-800 active:scale-95"
				on:click={closeMobileModal}
				aria-label="Close card preview"
			>
				<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					class="h-auto w-full max-w-[350px] rounded-2xl border-2 border-white/20 shadow-2xl"
				/>
			{:else}
				<div
					class="flex h-[490px] w-[350px] items-center justify-center rounded-2xl border-2 border-white/20 bg-gray-900"
				>
					<span class="text-gray-500">Image not available</span>
				</div>
			{/if}
			<button
				class="mt-4 flex w-full max-w-[350px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white p-3 px-6 text-sm font-semibold text-gray-900 shadow-xl transition-all duration-200 hover:bg-gray-100 active:scale-[0.98]"
				on:click={navigateToCard}
			>
				<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
					/>
				</svg>
				View Full Card
			</button>
			<p class="mt-3 text-center text-xs text-gray-500">Tap outside to close</p>
		</div>
	</div>
{/if}
