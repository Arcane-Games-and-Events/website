<script>
	// Card images are now resolved server-side - no 12MB JSON import needed!
	let { data } = $props();

	const { decklist } = data;

	// Cards now come with imageUrl and fallbackUrl from the server
	const cardsList = $derived(Array.isArray(decklist.cards) ? decklist.cards : []);
	const totalCards = $derived(cardsList.reduce((sum, card) => sum + (card.quantity || 1), 0));

	// Hero image is now provided by the server
	const heroImage = $derived(decklist.heroImage);

	function getCardCategory(card) {
		// Check section first (equipment/arena)
		if (card.section) {
			const section = card.section.toLowerCase();
			if (section === 'equipment' || section === 'arena') return 'equipment';
		}

		// Use pitch from server-resolved data
		const pitch = card.pitch;
		if (pitch !== undefined && pitch !== null && pitch !== '') {
			if (pitch === 1 || pitch === '1') return 'red';
			if (pitch === 2 || pitch === '2') return 'yellow';
			if (pitch === 3 || pitch === '3') return 'blue';
		}

		// Fall back to section color
		if (card.section) {
			const section = card.section.toLowerCase();
			if (section === 'red') return 'red';
			if (section === 'yellow') return 'yellow';
			if (section === 'blue') return 'blue';
		}

		// Default to equipment for items without pitch/color
		return 'equipment';
	}

	const groupedCards = $derived(() => {
		const groups = { equipment: [], colorless: [], red: [], yellow: [], blue: [] };
		for (const card of cardsList) {
			groups[getCardCategory(card)].push(card);
		}
		return groups;
	});

	// Create hero card object with server-provided image URLs
	const heroCard = $derived(() => {
		if (!decklist.hero) return null;
		return {
			name: decklist.hero,
			quantity: 1,
			section: 'equipment',
			isHero: true,
			imageUrl: heroImage?.imageUrl,
			fallbackUrl: heroImage?.fallbackUrl
		};
	});

	// Smart column layout for pitched cards + colorless
	const columnLayout = $derived(() => {
		const red = groupedCards().red;
		const yellow = groupedCards().yellow;
		const blue = groupedCards().blue;
		const colorless = groupedCards().colorless;

		// Find which categories have cards
		const activeCategories = [
			{ key: 'red', cards: red, count: red.length },
			{ key: 'yellow', cards: yellow, count: yellow.length },
			{ key: 'blue', cards: blue, count: blue.length },
			{ key: 'colorless', cards: colorless, count: colorless.length }
		].filter(c => c.count > 0);

		const total = activeCategories.reduce((sum, c) => sum + c.count, 0);
		if (total === 0) return { columns: [] };

		if (activeCategories.length === 1) {
			return { columns: [activeCategories] };
		}

		if (activeCategories.length === 2) {
			return { columns: [[activeCategories[0]], [activeCategories[1]]] };
		}

		// 3+ categories - find optimal 2-column arrangement
		// Sort by count descending
		const sorted = [...activeCategories].sort((a, b) => b.count - a.count);

		// Greedy assignment: assign each category to the shorter column
		const col1 = [];
		const col2 = [];
		let col1Height = 0;
		let col2Height = 0;

		for (const category of sorted) {
			if (col1Height <= col2Height) {
				col1.push(category);
				col1Height += category.count;
			} else {
				col2.push(category);
				col2Height += category.count;
			}
		}

		return { columns: [col1, col2].filter(col => col.length > 0) };
	});

	// Selected card for preview panel
	let selectedCard = $state(null);
	let selectedCardImage = $state(null);
	let previewImageLoaded = $state(false);
	let previewImageError = $state(false);
	let previewCurrentUrl = $state(null);
	let previewTriedFallback = $state(false);

	function selectCard(card) {
		selectedCard = card;
		// Use the server-provided imageUrl and fallbackUrl directly from the card
		selectedCardImage = card ? { imageUrl: card.imageUrl, fallbackUrl: card.fallbackUrl } : null;
		previewImageLoaded = false;
		previewImageError = false;
		previewTriedFallback = false;
		previewCurrentUrl = selectedCardImage?.imageUrl || null;
	}

	function handlePreviewLoad() { previewImageLoaded = true; }
	function handlePreviewError() {
		if (!previewTriedFallback && selectedCardImage?.fallbackUrl && selectedCardImage.fallbackUrl !== previewCurrentUrl) {
			previewTriedFallback = true;
			previewCurrentUrl = selectedCardImage.fallbackUrl;
			previewImageLoaded = false;
		} else {
			previewImageError = true;
		}
	}

	// Auto-select hero card on load
	$effect(() => {
		if (!selectedCard && heroCard()) {
			selectCard(heroCard());
		}
	});

	function formatDate(dateStr) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function getOrdinal(n) {
		if (!n) return '';
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}

	function formatMonth(month) {
		if (!month) return '';
		return month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
	}

	function getCircuitColor(circuit) {
		const colors = {
			'Los Angeles': 'text-blue-400',
			'St. Louis': 'text-red-400',
			'New England': 'text-emerald-400'
		};
		return colors[circuit] || 'text-gray-300';
	}

	// Category config - enhanced styling matching site aesthetic
	// Stripe-style shadow
	const cardShadow = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_6px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.12)]';

	const categoryConfig = {
		equipment: {
			label: 'Equipment',
			accent: 'bg-gray-500',
			text: 'text-gray-400',
			bg: 'bg-gray-900/80',
			hover: 'hover:bg-gray-800/60',
			badge: 'text-gray-300',
			headerBg: 'bg-gray-800/60'
		},
		colorless: {
			label: 'Colorless',
			accent: 'bg-slate-400',
			text: 'text-slate-300',
			bg: 'bg-gray-900/80',
			hover: 'hover:bg-gray-800/60',
			badge: 'text-slate-300',
			headerBg: 'bg-slate-800/40'
		},
		red: {
			label: 'Red',
			accent: 'bg-red-500',
			text: 'text-red-400',
			bg: 'bg-gray-900/80',
			hover: 'hover:bg-gray-800/60',
			badge: 'text-red-400',
			headerBg: 'bg-red-950/50'
		},
		yellow: {
			label: 'Yellow',
			accent: 'bg-yellow-500',
			text: 'text-yellow-400',
			bg: 'bg-gray-900/80',
			hover: 'hover:bg-gray-800/60',
			badge: 'text-yellow-400',
			headerBg: 'bg-yellow-950/50'
		},
		blue: {
			label: 'Blue',
			accent: 'bg-blue-500',
			text: 'text-blue-400',
			bg: 'bg-gray-900/80',
			hover: 'hover:bg-gray-800/60',
			badge: 'text-blue-400',
			headerBg: 'bg-blue-950/50'
		}
	};

	// Copy link state
	let linkCopied = $state(false);
	async function copyLink() {
		await navigator.clipboard.writeText(window.location.href);
		linkCopied = true;
		setTimeout(() => linkCopied = false, 2000);
	}

	// Modal state for mobile card preview
	let showModal = $state(false);
	let modalCard = $state(null);
	let modalCardImage = $state(null);
	let modalImageLoaded = $state(false);
	let modalImageError = $state(false);
	let modalCurrentUrl = $state(null);
	let modalTriedFallback = $state(false);

	function openCardModal(card) {
		modalCard = card;
		// Use the server-provided imageUrl and fallbackUrl directly from the card
		modalCardImage = card ? { imageUrl: card.imageUrl, fallbackUrl: card.fallbackUrl } : null;
		modalImageLoaded = false;
		modalImageError = false;
		modalTriedFallback = false;
		modalCurrentUrl = modalCardImage?.imageUrl || null;
		showModal = true;
		// Prevent body scroll when modal is open
		document.body.style.overflow = 'hidden';
	}

	function closeModal() {
		showModal = false;
		document.body.style.overflow = '';
	}

	function handleModalLoad() { modalImageLoaded = true; }
	function handleModalError() {
		if (!modalTriedFallback && modalCardImage?.fallbackUrl && modalCardImage.fallbackUrl !== modalCurrentUrl) {
			modalTriedFallback = true;
			modalCurrentUrl = modalCardImage.fallbackUrl;
			modalImageLoaded = false;
		} else {
			modalImageError = true;
		}
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			closeModal();
		}
	}

	// Handle escape key to close modal
	function handleKeydown(e) {
		if (e.key === 'Escape' && showModal) {
			closeModal();
		}
	}

	// Hero image state for mobile header
	let heroImageLoaded = $state(false);
	let heroImageError = $state(false);
	let heroCurrentUrl = $state(null);
	let heroTriedFallback = $state(false);

	function handleHeroLoad() { heroImageLoaded = true; }
	function handleHeroError() {
		if (!heroTriedFallback && heroImage?.fallbackUrl && heroImage.fallbackUrl !== heroCurrentUrl) {
			heroTriedFallback = true;
			heroCurrentUrl = heroImage.fallbackUrl;
			heroImageLoaded = false;
		} else {
			heroImageError = true;
		}
	}

	// Initialize hero URL when heroImage changes
	$effect(() => {
		if (heroImage?.imageUrl) {
			heroCurrentUrl = heroImage.imageUrl;
			heroImageLoaded = false;
			heroImageError = false;
			heroTriedFallback = false;
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{decklist.playerName}'s {decklist.hero || 'Deck'} - AGE Open</title>
	<meta name="description" content="Decklist for {decklist.playerName} playing {decklist.hero || 'Deck'}" />
	<!-- Preload hero and first few card images for instant display -->
	{#if heroImage?.imageUrl}
		<link rel="preload" as="image" href={heroImage.imageUrl} />
	{/if}
	{#each cardsList.slice(0, 6) as card}
		{#if card.imageUrl}
			<link rel="preload" as="image" href={card.imageUrl} />
		{/if}
	{/each}
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Header with subtle gradient -->
	<div class="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-40">
		<div class="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<a href="/age-open?tab=decklists" class="group flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
					<svg class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					<span class="font-medium">Decklists</span>
				</a>
				<button
					onclick={copyLink}
					class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800/80 border border-transparent hover:border-gray-700 transition-all"
					title="Copy link"
				>
					{#if linkCopied}
						<svg class="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						<span class="text-green-400">Copied</span>
					{:else}
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
						</svg>
						<span class="hidden sm:inline">Share</span>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
		{#if cardsList.length === 0}
			<div class="rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm p-12 text-center">
				<div class="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700">
					<svg class="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">No Cards Found</h3>
				<p class="text-gray-400 max-w-sm mx-auto">This decklist doesn't have any cards yet. Check back later or contact the tournament organizer.</p>
			</div>
		{:else}
			<div class="flex flex-col lg:flex-row gap-6">
				<!-- Mobile Hero Header -->
				<div class="lg:hidden">
					<div class="rounded-xl bg-gray-900/90 backdrop-blur-sm p-4 {cardShadow}">
						<!-- Player Name & Placement -->
						<div class="flex items-start justify-between gap-3 mb-3">
							<div class="min-w-0">
								{#if decklist.gemId}
									<a href="/player/{decklist.gemId}" class="text-white font-semibold text-lg hover:text-amber-400 transition-colors block truncate">
										{decklist.playerName}
									</a>
								{:else}
									<span class="text-white font-semibold text-lg block truncate">{decklist.playerName}</span>
								{/if}
							</div>
							{#if decklist.placement}
								<div class="flex-shrink-0 text-right">
									<span class="text-2xl font-bold {decklist.placement <= 3 ? 'text-amber-400' : 'text-gray-300'}">{getOrdinal(decklist.placement)}</span>
								</div>
							{/if}
						</div>

						<!-- Event Info -->
						<div class="space-y-1.5 text-sm mb-3">
							<div class="flex items-center gap-2 {getCircuitColor(decklist.circuit)}">
								<svg class="w-3.5 h-3.5 opacity-60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
								</svg>
								<span class="truncate font-medium">{decklist.circuit || 'AGE Open'}</span>
							</div>
							{#if decklist.eventDate}
								<div class="flex items-center gap-2 text-gray-400">
									<svg class="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									<span>{formatDate(decklist.eventDate)}</span>
								</div>
							{/if}
							{#if decklist.format}
								<div class="flex items-center gap-2 text-gray-400">
									<svg class="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
									</svg>
									<span>{decklist.format}</span>
								</div>
							{/if}
						</div>

						<!-- Divider -->
						<div class="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-3"></div>

						<!-- Deck Composition -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-1.5" title="Red">
									<span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
									<span class="text-sm font-medium text-red-400">{groupedCards().red.length}</span>
								</div>
								<div class="flex items-center gap-1.5" title="Yellow">
									<span class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
									<span class="text-sm font-medium text-yellow-400">{groupedCards().yellow.length}</span>
								</div>
								<div class="flex items-center gap-1.5" title="Blue">
									<span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
									<span class="text-sm font-medium text-blue-400">{groupedCards().blue.length}</span>
								</div>
								{#if groupedCards().colorless.length > 0}
									<div class="flex items-center gap-1.5" title="Colorless">
										<span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
										<span class="text-sm font-medium text-slate-300">{groupedCards().colorless.length}</span>
									</div>
								{/if}
							</div>
							<span class="text-sm text-gray-500">{totalCards} cards</span>
						</div>
					</div>
				</div>

				<!-- Card Preview Panel (Left - Sticky on Desktop, Hidden on Mobile) -->
				<div class="hidden lg:block lg:w-72 flex-shrink-0">
					<div class="lg:sticky lg:top-16">
						<!-- Card Preview with glow effect -->
						<div class="relative group">
							<!-- Subtle glow behind card -->
							<div class="absolute -inset-1 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

							<div class="relative rounded-xl bg-gray-900/90 backdrop-blur-sm overflow-hidden {cardShadow}">
								<div class="aspect-[488/680] bg-gradient-to-br from-gray-800/80 to-gray-900/80 relative">
									{#if selectedCard && selectedCardImage}
										{#if !previewImageLoaded && !previewImageError}
											<div class="absolute inset-0 flex items-center justify-center">
												<div class="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/50 border-t-amber-500"></div>
											</div>
										{/if}
										{#if previewImageError}
											<div class="absolute inset-0 flex items-center justify-center">
												<div class="text-center px-4">
													<svg class="mx-auto h-10 w-10 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
													</svg>
													<p class="text-gray-500 text-sm">Image unavailable</p>
												</div>
											</div>
										{/if}
										{#if previewCurrentUrl}
											{#key previewCurrentUrl}
												<img
													src={previewCurrentUrl}
													alt={selectedCard.name || selectedCard}
													class="w-full h-full object-contain {previewImageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300"
													onload={handlePreviewLoad}
													onerror={handlePreviewError}
												/>
											{/key}
										{/if}
									{:else}
										<div class="absolute inset-0 flex items-center justify-center">
											<div class="text-center px-4">
												<svg class="mx-auto h-10 w-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
												</svg>
												<p class="text-gray-500 text-sm">Select a card to preview</p>
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>

						<!-- Player & Event Info Card -->
						<div class="mt-4 rounded-xl bg-gray-900/90 backdrop-blur-sm p-4 {cardShadow}">
							<!-- Player Name & Placement -->
							<div class="flex items-start justify-between gap-3 mb-3">
								<div class="min-w-0">
									{#if decklist.gemId}
										<a href="/player/{decklist.gemId}" class="text-white font-semibold text-lg hover:text-amber-400 transition-colors block truncate">
											{decklist.playerName}
										</a>
									{:else}
										<span class="text-white font-semibold text-lg block truncate">{decklist.playerName}</span>
									{/if}
								</div>
								{#if decklist.placement}
									<div class="flex-shrink-0 text-right">
										<span class="text-2xl font-bold {decklist.placement <= 3 ? 'text-amber-400' : 'text-gray-300'}">{getOrdinal(decklist.placement)}</span>
									</div>
								{/if}
							</div>

							<!-- Event Info -->
							<div class="space-y-1.5 text-sm mb-3">
								<div class="flex items-center gap-2 {getCircuitColor(decklist.circuit)}">
									<svg class="w-3.5 h-3.5 opacity-60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									</svg>
									<span class="truncate font-medium">{decklist.circuit || 'AGE Open'}</span>
								</div>
								{#if decklist.eventDate}
									<div class="flex items-center gap-2 text-gray-400">
										<svg class="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										<span>{formatDate(decklist.eventDate)}</span>
									</div>
								{/if}
								{#if decklist.format}
									<div class="flex items-center gap-2 text-gray-400">
										<svg class="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
										</svg>
										<span>{decklist.format}</span>
									</div>
								{/if}
							</div>

							<!-- Divider -->
							<div class="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-3"></div>

							<!-- Deck Composition -->
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="flex items-center gap-1.5" title="Red">
										<span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
										<span class="text-sm font-medium text-red-400">{groupedCards().red.length}</span>
									</div>
									<div class="flex items-center gap-1.5" title="Yellow">
										<span class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
										<span class="text-sm font-medium text-yellow-400">{groupedCards().yellow.length}</span>
									</div>
									<div class="flex items-center gap-1.5" title="Blue">
										<span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
										<span class="text-sm font-medium text-blue-400">{groupedCards().blue.length}</span>
									</div>
									{#if groupedCards().colorless.length > 0}
										<div class="flex items-center gap-1.5" title="Colorless">
											<span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
											<span class="text-sm font-medium text-slate-300">{groupedCards().colorless.length}</span>
										</div>
									{/if}
								</div>
								<span class="text-sm text-gray-500">{totalCards} cards</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Card List (Right) -->
				<div class="flex-1 min-w-0 space-y-5">
					<!-- Hero & Equipment Panel -->
					<div class="rounded-xl bg-gray-900/90 backdrop-blur-sm p-4 {cardShadow}">
						<div class="flex items-center gap-2 mb-3">
							<svg class="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							<span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Hero & Equipment</span>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							<!-- Hero -->
							{#if heroCard()}
								<button
									class="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium text-sm hover:bg-amber-500/20 hover:border-amber-500/30 transition-all cursor-pointer"
									onclick={() => { selectCard(heroCard()); if (window.innerWidth < 1024) openCardModal(heroCard()); }}
								>
									{decklist.hero}
								</button>
							{/if}

							<!-- Equipment -->
							{#if groupedCards().equipment.length > 0}
								{#each groupedCards().equipment as card}
									<button
										class="px-2 py-1 rounded-lg bg-gray-800/80 border border-gray-700/50 text-gray-300 text-sm hover:bg-gray-700/80 hover:text-white hover:border-gray-600 transition-all cursor-pointer"
										onclick={() => { selectCard(card); if (window.innerWidth < 1024) openCardModal(card); }}
									>{card.quantity || 1}x {card.name}</button>
								{/each}
							{/if}
						</div>
					</div>

					<!-- Pitched Cards - Single column on mobile, smart layout on desktop -->
					{#if columnLayout().columns.length > 0}
						<div class="space-y-3 lg:hidden">
							<!-- Mobile: Single column with all categories stacked -->
							{#each columnLayout().columns as column}
								{#each column as colorGroup}
									{@const config = categoryConfig[colorGroup.key]}
									<div class="rounded-xl {config.bg} overflow-hidden {cardShadow}">
										<div class="px-4 py-2 {config.headerBg} flex items-center gap-2.5">
											<span class="w-2 h-2 rounded-full {config.accent} shadow-sm"></span>
											<span class="text-sm font-semibold {config.text}">{config.label}</span>
											<span class="text-xs text-gray-500 ml-auto font-medium">{colorGroup.cards.reduce((s, c) => s + (c.quantity || 1), 0)} cards</span>
										</div>
										<div class="p-1">
											{#each colorGroup.cards as card}
												{@const isSelected = selectedCard === card}
												<button
													type="button"
													class="w-full flex items-center gap-2 py-1 px-2.5 rounded-lg text-left transition-all
														{isSelected ? 'bg-white/5' : config.hover}
														cursor-pointer group"
													onclick={() => { selectCard(card); if (window.innerWidth < 1024) openCardModal(card); }}
												>
													<span class="w-5 text-center text-xs font-bold {config.badge} opacity-80">
														{card.quantity || 1}x
													</span>
													<span class="text-sm text-gray-200 truncate flex-1 group-hover:text-white transition-colors">
														{card.name || card}
													</span>
													{#if isSelected}
														<span class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 animate-pulse"></span>
													{/if}
												</button>
											{/each}
										</div>
									</div>
								{/each}
							{/each}
						</div>

						<!-- Desktop: Smart column layout -->
						<div class="hidden lg:grid gap-4" style="grid-template-columns: repeat({columnLayout().columns.length}, minmax(0, 1fr));">
							{#each columnLayout().columns as column}
								<div class="space-y-3">
									{#each column as colorGroup}
										{@const config = categoryConfig[colorGroup.key]}
										<div class="rounded-xl {config.bg} overflow-hidden {cardShadow}">
											<!-- Category Header -->
											<div class="px-4 py-2.5 {config.headerBg} flex items-center gap-2.5">
												<span class="w-2 h-2 rounded-full {config.accent} shadow-sm"></span>
												<span class="text-sm font-semibold {config.text}">{config.label}</span>
												<span class="text-xs text-gray-500 ml-auto font-medium">{colorGroup.cards.reduce((s, c) => s + (c.quantity || 1), 0)} cards</span>
											</div>

											<!-- Cards List -->
											<div class="p-1">
												{#each colorGroup.cards as card}
													{@const isSelected = selectedCard === card}
													<button
														type="button"
														class="w-full flex items-center gap-2 py-1 px-2.5 rounded-lg text-left transition-all
															{isSelected ? 'bg-white/5' : config.hover}
															cursor-pointer group"
														onclick={() => { selectCard(card); if (window.innerWidth < 1024) openCardModal(card); }}
													>
														<span class="w-5 text-center text-xs font-bold {config.badge} opacity-80">
															{card.quantity || 1}x
														</span>
														<span class="text-sm text-gray-200 truncate flex-1 group-hover:text-white transition-colors">
															{card.name || card}
														</span>
														{#if isSelected}
															<span class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 animate-pulse"></span>
														{/if}
													</button>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Card Preview Modal (Mobile) -->
{#if showModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="Card preview"
		tabindex="-1"
	>
		<div class="relative w-full max-w-sm">
			<!-- Close Button -->
			<button
				onclick={closeModal}
				class="absolute -top-12 right-0 p-2 rounded-full bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-10"
				aria-label="Close modal"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			<!-- Card Image Container -->
			<div class="rounded-2xl bg-gray-900 overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.15),0_24px_48px_rgba(0,0,0,0.2)]">
				<div class="aspect-[488/680] bg-gradient-to-br from-gray-800 to-gray-900 relative">
					{#if modalCard && modalCardImage}
						{#if !modalImageLoaded && !modalImageError}
							<div class="absolute inset-0 flex items-center justify-center">
								<div class="animate-spin rounded-full h-10 w-10 border-2 border-amber-500/50 border-t-amber-500"></div>
							</div>
						{/if}
						{#if modalImageError}
							<div class="absolute inset-0 flex items-center justify-center">
								<div class="text-center px-4">
									<svg class="mx-auto h-12 w-12 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									<p class="text-gray-400 text-sm">Image unavailable</p>
								</div>
							</div>
						{/if}
						{#if modalCurrentUrl}
							{#key modalCurrentUrl}
								<img
									src={modalCurrentUrl}
									alt={modalCard.name || modalCard}
									class="w-full h-full object-contain {modalImageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300"
									onload={handleModalLoad}
									onerror={handleModalError}
								/>
							{/key}
						{/if}
					{:else}
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="text-center px-4">
								<svg class="mx-auto h-12 w-12 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
								<p class="text-gray-500 text-sm">No card selected</p>
							</div>
						</div>
					{/if}
				</div>

			</div>
		</div>
	</div>
{/if}
