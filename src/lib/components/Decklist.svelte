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

<!--
	Editorial decklist module — matches the design handoff (`mz-deck`)
	exactly. All colours are explicit hex values from the handoff's
	LIGHT palette so the module reads the same in light + dark modes
	(it's a content card, not chrome — it shouldn't flip).

	Palette (handoff light):
	- ink         #17150F   — header bg + body text
	- bg          #FBFAF6   — body bg
	- paper       #F4F0E6   — footer bg
	- line        #E4DECF   — hairline rules between cards
	- line2       #C7BFA9   — section dividers
	- soft        #56503F   — footer italic credit
	- fade        #928B79   — counts + quantities
	- gold accent #F4C66A   — hero name in header
	- red         #A8392C   — RED column
	- yellow      #E5703E   — YELLOW column
	- blue        #2C5BA8   — BLUE column
	- prem green  #1C7A4B   — Fabrary link
	- hover warm  #C0461F   — card-link hover
-->
<!--
	`not-prose` opts the entire decklist out of the article body's
	prose-* link styling (which would otherwise paint every <a> blue
	with an underline). Card names stay black with no underline, which
	matches the handoff screenshot.
-->
<div class="not-prose my-8 border border-[#17150F] bg-[#FBFAF6]">
	<!-- ============ HEADER ============ -->
	{#if isNewFormat}
		{#if deckName || hero || format}
			<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 bg-[#17150F] px-7 py-6">
				<div>
					{#if deckName}
						<h3 class="font-newsreader m-0 text-[26px] font-semibold leading-[1.05] tracking-[-0.01em] text-white">
							{deckName}
						</h3>
					{/if}
					{#if hero || format || creator}
						<div class="mt-2 flex flex-wrap items-center gap-3 text-[13px] font-semibold">
							{#if hero}
								<span class="font-bold tracking-[0.02em] text-[#F4C66A]">
									{hero}
								</span>
							{/if}
							{#if hero && (format || creator)}
								<span class="text-white/40">·</span>
							{/if}
							{#if format}
								<span class="text-white/70">{format}</span>
							{/if}
							{#if (hero || format) && creator}
								<span class="text-white/40">·</span>
							{/if}
							{#if creator}
								<span class="text-white/70">by {creator}</span>
							{/if}
						</div>
					{/if}
				</div>
				{#if totalCards > 0}
					<div class="font-mono-system text-[13px] font-bold text-white">
						<span>{totalCards}</span>
						<span class="ml-1 text-white/60">cards</span>
					</div>
				{/if}
			</div>
		{/if}
	{:else if decklist.title}
		<div class="flex items-baseline justify-between gap-x-6 bg-[#17150F] px-7 py-6">
			<h3 class="font-newsreader m-0 text-[26px] font-semibold leading-[1.05] tracking-[-0.01em] text-white">
				{decklist.title}
			</h3>
			{#if totalCards > 0}
				<div class="font-mono-system text-[13px] font-bold text-white">
					<span>{totalCards}</span>
					<span class="ml-1 text-white/60">cards</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ============ BODY ============ -->
	{#if isNewFormat}
		<!-- Arena · Equipment — full-width strip with 2-col list -->
		{#if processedCards.arena && processedCards.arena.length > 0}
			{@const _arenaCount = processedCards.arena.reduce((s, c) => s + (c.quantity || 1), 0)}
			<div class="border-b border-[#C7BFA9] px-6 pt-4 pb-3">
				<div class="mb-2 flex items-baseline justify-between gap-3">
					<span class="text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#17150F]">
						Arena · Equipment
					</span>
					<span class="font-mono-system text-[12px] font-bold text-[#928B79]">
						{_arenaCount} {_arenaCount === 1 ? 'piece' : 'pieces'}
					</span>
				</div>
				<div class="columns-1 gap-x-9 sm:columns-2">
					{#each processedCards.arena as card (card.name)}
						{@const arenaCardImg = getCardImage(card.name, null)}
						<div class="flex items-baseline gap-3 break-inside-avoid border-b border-[#E4DECF] py-[3px] last:border-b-0">
							<span class="font-mono-system w-[26px] flex-shrink-0 text-[12px] font-bold tabular-nums text-[#928B79]">
								{card.quantity}×
							</span>
							<a
								href={getSearchUrl(card.name)}
								target="_blank"
								rel="noopener noreferrer"
								data-card-name={card.name}
								data-card-image={arenaCardImg?.imageUrl || null}
								data-card-fallback={arenaCardImg?.fallbackUrl || null}
								class="card-link !no-underline truncate text-[14.5px] font-bold !text-[#17150F] transition-colors hover:!text-[#C0461F]"
								title={card.name}
							>
								{card.name}
							</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Three colour columns -->
		{@const _colourColors = {
			red: '#A8392C',
			yellow: '#E5703E',
			blue: '#2C5BA8',
			colorless: '#56503F'
		}}
		{@const _activeColors = colorOrder.filter((c) => processedCards.deck[c] && processedCards.deck[c].length > 0)}
		{#if _activeColors.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-3">
				{#each _activeColors as color, i (color)}
					{@const _count = processedCards.deck[color].reduce((s, c) => s + c.quantity, 0)}
					{@const _hex = _colourColors[color]}
					<div
						class="border-t border-[#C7BFA9] {i < _activeColors.length - 1
							? 'md:border-r'
							: ''} px-6 pt-4 pb-4 md:border-t-0 md:first:border-t-0"
					>
						<div class="mb-2 flex items-baseline justify-between gap-3">
							<span
								class="text-[12px] font-extrabold tracking-[0.16em] uppercase"
								style="color: {_hex};"
							>
								{colorLabels[color]}
							</span>
							<span class="font-mono-system text-[12px] font-bold text-[#928B79]">
								{_count} cards
							</span>
						</div>
						{#each processedCards.deck[color] as card (card.name)}
							{@const deckCardImg = getCardImage(card.name, colorToPitchLetter(color))}
							<div class="flex items-baseline gap-3 border-t border-[#E4DECF] py-[3px] first:border-t-0">
								<span class="font-mono-system w-[24px] flex-shrink-0 text-[12px] font-bold tabular-nums text-[#928B79]">
									{card.quantity}×
								</span>
								<a
									href={getSearchUrl(card.name)}
									target="_blank"
									rel="noopener noreferrer"
									data-card-name={card.name}
									data-card-pitch={colorToPitch(color)}
									data-card-image={deckCardImg?.imageUrl || null}
									data-card-fallback={deckCardImg?.fallbackUrl || null}
									class="card-link !no-underline truncate text-[13.5px] font-bold !text-[#17150F] transition-colors hover:!text-[#C0461F]"
									title={card.name}
								>
									{card.name}
								</a>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- Legacy Format: Cards grouped by type, editorial column layout -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
			{#each sortedTypes as type, i (type)}
				{#if groupedCards[type] && groupedCards[type].length > 0}
					<div
						class="border-t border-[#C7BFA9] {i % 3 !== 2 ? 'lg:border-r' : ''} {i % 2 !== 1
							? 'md:border-r'
							: ''} px-6 pt-4 pb-4 md:first:border-t-0"
					>
						<div class="mb-2 text-[12px] font-extrabold tracking-[0.16em] uppercase text-[#17150F]">
							{typeLabels[type] || type}
						</div>
						{#each groupedCards[type] as card (card.name)}
							{@const legacyCardImg = getCardImage(card.name, null)}
							<div class="flex items-baseline gap-3 border-t border-[#E4DECF] py-[3px] first:border-t-0">
								<span class="font-mono-system w-[24px] flex-shrink-0 text-[12px] font-bold tabular-nums text-[#928B79]">
									{card.quantity}×
								</span>
								<a
									href={card.url ||
										`https://cards.fabtcg.com/results/?q=${encodeURIComponent(card.id || card.name)}`}
									target="_blank"
									rel="noopener noreferrer"
									data-card-name={card.name}
									data-card-image={legacyCardImg?.imageUrl || null}
									data-card-fallback={legacyCardImg?.fallbackUrl || null}
									class="card-link !no-underline truncate text-[13.5px] font-bold !text-[#17150F] transition-colors hover:!text-[#C0461F]"
									title={card.name}
								>
									{card.name}
								</a>
							</div>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- ============ FOOTER ============ -->
	{#if fabraryUrl || (isNewFormat && creator)}
		<div class="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#17150F] bg-[#F4F0E6] px-6 py-[14px]">
			{#if isNewFormat && creator}
				<span class="font-newsreader text-[13px] italic text-[#56503F]">
					Based on {creator}'s list
				</span>
			{:else}
				<span></span>
			{/if}
			{#if fabraryUrl}
				<a
					href={fabraryUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#1C7A4B] no-underline transition-[filter] hover:brightness-110"
				>
					Open in Fabrary →
				</a>
			{/if}
		</div>
	{/if}
</div>
