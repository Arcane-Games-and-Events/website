<script>
	// Card images are now resolved server-side - no 12MB JSON import needed!
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	let { data } = $props();

	const decklist = $derived(data.decklist);

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
		].filter((c) => c.count > 0);

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

		return { columns: [col1, col2].filter((col) => col.length > 0) };
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

	function handlePreviewLoad() {
		previewImageLoaded = true;
	}
	function handlePreviewError() {
		if (
			!previewTriedFallback &&
			selectedCardImage?.fallbackUrl &&
			selectedCardImage.fallbackUrl !== previewCurrentUrl
		) {
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
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
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

	// Map a hero name (e.g. "Victor Goldmane, High and Mighty") to the
	// matching local hero portrait under /static/hero_images/. These are
	// full-resolution illustrations (~1000px wide) — much sharper for
	// use as the cinematic header backdrop than the small card scans
	// returned by `resolveCardImage` (which top out around 488px).
	function getHeroBackdrop(heroName) {
		if (!heroName) return null;
		const slug = heroName
			.toLowerCase()
			.replace(/ð/g, 'd')
			.replace(/þ/g, 'th')
			.replace(/æ/g, 'ae')
			.replace(/ø/g, 'o')
			.replace(/å/g, 'a')
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[!@#$%^&*()+=[\]{}|\\:;<>?/~`]/g, '')
			.replace(/[,'"]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
		return `/hero_images/${slug}.webp`;
	}

	const heroBackdrop = $derived(getHeroBackdrop(decklist.hero));

	// Category config - enhanced styling matching site aesthetic
	// Stripe-style shadow
	const cardShadow =
		'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_6px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.12)]';

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
		setTimeout(() => (linkCopied = false), 2000);
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

	function handleModalLoad() {
		modalImageLoaded = true;
	}
	function handleModalError() {
		if (
			!modalTriedFallback &&
			modalCardImage?.fallbackUrl &&
			modalCardImage.fallbackUrl !== modalCurrentUrl
		) {
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

	function handleHeroLoad() {
		heroImageLoaded = true;
	}
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
	<title>{decklist.playerName}'s {decklist.hero || 'Deck'} — AGE Open</title>
	<meta
		name="description"
		content="Decklist for {decklist.playerName} playing {decklist.hero || 'Deck'}"
	/>
	{#if heroBackdrop}
		<link rel="preload" as="image" href={heroBackdrop} />
	{/if}
	{#if heroImage?.imageUrl}
		<link rel="preload" as="image" href={heroImage.imageUrl} />
	{/if}
	{#each cardsList.slice(0, 6) as card}
		{#if card.imageUrl}
			<link rel="preload" as="image" href={card.imageUrl} />
		{/if}
	{/each}
</svelte:head>

<!--
	Editorial decklist viewer — matches the rest of the AGE Open redesign:
	ink/paper palette, hairline column rules, mono uppercase eyebrows,
	serif Newsreader headings. All colour values are explicit handoff
	hex values so the page reads identically regardless of theme (this
	is a content view, not chrome).
-->

{#snippet placementColor(n)}{n === 1 ? '#C8922E' : n <= 3 ? '#C0461F' : n <= 8 ? '#16489E' : '#56503F'}{/snippet}

<AgeShell active="AGE Open">
	<!-- ============ BREADCRUMB ROW ============ -->
	<div class="border-b border-[#C7BFA9]">
		<div
			class="mx-auto flex w-full max-w-[min(94vw,1920px)] items-center justify-between gap-3 px-14 py-[14px]"
		>
			<a
				href="/age-open?tab=decklists"
				class="text-soft hover:text-ink group inline-flex items-center gap-2 text-[11px] font-extrabold tracking-[0.08em] uppercase transition-colors"
			>
				<svg
					class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1"
					fill="none"
					stroke="currentColor"
					stroke-width="1.7"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to Decklists
			</a>
			<button
				type="button"
				onclick={copyLink}
				class="border-line2 text-soft hover:border-ink hover:text-ink inline-flex cursor-pointer items-center gap-2 border bg-transparent px-[13px] py-[7px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase transition-colors"
				title="Copy link"
			>
				{#if linkCopied}
					<svg class="text-prem h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
					<span class="text-prem">Link copied</span>
				{:else}
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
						/>
					</svg>
					Share
				{/if}
			</button>
		</div>
	</div>

	<!-- ============ CINEMATIC HEADER ============ -->
	<!--
		Dark editorial band with the hero card image as a backdrop and a
		strong angled gradient over it — same treatment as the Library
		featured spotlight. The composition strip below the headline
		sits on the inverted scorecard look so its hex-tinted color
		chips read as a high-contrast counter to the dark title block.
	-->
	<section
		class="border-ink relative overflow-hidden border-b-[3px] border-double bg-[#0F0E0A]"
	>
		<!--
			Cinematic backdrop. The hero illustration sits at native
			resolution on the right side of the band — height-constrained,
			width auto so it stays crisp.

			The trick that kills the abrupt vertical seam: a CSS mask on
			the image itself. The mask fades from `transparent` at the
			image's left edge to `black` (opaque) further into the
			image, so the image's own pixels dissolve into the dark
			band rather than just dropping off a hard left boundary.
			`-webkit-mask-image` is the Safari prefix.
		-->
		{#if heroBackdrop}
			<img
				src={heroBackdrop}
				alt=""
				aria-hidden="true"
				class="absolute top-0 right-0 bottom-0 z-0 h-full w-auto max-w-[65%] object-cover object-[center_25%]"
				style="-webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.6) 45%, #000 70%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.6) 45%, #000 70%);"
				onerror={(e) => {
					e.currentTarget.style.display = 'none';
				}}
			/>
		{/if}
		<!--
			Thin left-side scrim — keeps the title block on a fully
			opaque dark for legibility, then quickly steps out of the
			way so the masked image fade is what the eye sees in the
			middle / right.
		-->
		<span
			class="pointer-events-none absolute inset-0 z-[1]"
			style="background: linear-gradient(to right, #0F0E0A 22%, rgba(15,14,10,0.6) 38%, rgba(15,14,10,0) 60%);"
			aria-hidden="true"
		></span>
		<!-- top rust hairline accent matching the editorial header strip -->
		<span class="bg-warm absolute inset-x-0 top-0 z-[2] h-[2px]" aria-hidden="true"></span>

		<div
			class="relative z-[2] mx-auto w-full max-w-[min(94vw,1920px)] px-14 pt-[50px] pb-[36px]"
		>
			<div class="text-white max-w-[60%]">
				<div class="mb-4 inline-flex items-center gap-[10px] text-[10.5px] font-extrabold tracking-[0.2em] text-white uppercase before:block before:h-[2px] before:w-[26px] before:bg-warm before:content-['']">
					{decklist.circuit ? `${decklist.circuit} · Decklist` : 'AGE Open · Decklist'}
				</div>
				<div class="flex flex-wrap items-baseline gap-x-6 gap-y-2">
					{#if decklist.gemId}
						<a
							href="/player/{decklist.gemId}"
							class="font-newsreader text-[clamp(48px,7vw,72px)] leading-[0.95] font-semibold tracking-[-0.025em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.4)] transition-colors hover:text-[#f4c66a]"
						>
							{decklist.playerName}
						</a>
					{:else}
						<span class="font-newsreader text-[clamp(48px,7vw,72px)] leading-[0.95] font-semibold tracking-[-0.025em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.4)]">
							{decklist.playerName}
						</span>
					{/if}
					{#if decklist.placement}
						{@const _placeColor = decklist.placement === 1 ? '#F4C66A' : decklist.placement <= 3 ? '#E5703E' : decklist.placement <= 8 ? '#7FA6F0' : 'rgba(255,255,255,0.65)'}
						<span
							class="font-newsreader text-[clamp(34px,4.5vw,48px)] leading-none font-semibold tracking-[-0.015em] tabular-nums"
							style="color: {_placeColor};"
						>
							{getOrdinal(decklist.placement)}
						</span>
					{/if}
				</div>
				{#if decklist.hero}
					<div class="font-newsreader mt-3 text-[24px] leading-[1.15] font-medium italic text-[#E5703E]">
						{decklist.hero}
					</div>
				{/if}
				<div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold tracking-[0.08em] uppercase text-white/65">
					{#if decklist.circuit}
						{@const _ccColor = (decklist.circuit === 'Los Angeles' && '#7FA6F0') || (decklist.circuit === 'New England' && '#B79BD6') || (decklist.circuit === 'St. Louis' && '#5FC487') || '#FFFFFF'}
						<span class="inline-flex items-center gap-[7px]" style="color: {_ccColor};">
							<span class="block h-[8px] w-[8px]" style="background-color: {_ccColor};"></span>
							{decklist.circuit}
						</span>
					{/if}
					{#if decklist.eventDate}
						<span class="text-white/30">·</span>
						<span>{formatDate(decklist.eventDate)}</span>
					{/if}
					{#if decklist.month}
						<span class="text-white/30">·</span>
						<span>{formatMonth(decklist.month)}</span>
					{/if}
					{#if decklist.format}
						<span class="text-white/30">·</span>
						<span>{decklist.format}</span>
					{/if}
				</div>
			</div>

		</div>
	</section>

	<!-- ============ BODY ============ -->
	{#if cardsList.length === 0}
		<section class="px-14 py-[60px]">
			<div class="mx-auto w-full max-w-[min(94vw,1920px)]">
				<div class="border-line2 bg-paper py-14 text-center">
					<div class="font-newsreader text-ink mb-2 text-[24px] font-semibold">No cards found</div>
					<p class="text-soft m-0 mx-auto max-w-[420px] text-[14px] leading-[1.55]">
						This decklist doesn't have any cards yet. Check back later or contact the tournament
						organizer.
					</p>
				</div>
			</div>
		</section>
	{:else}
		<div
			class="mx-auto grid w-full max-w-[min(94vw,1920px)] grid-cols-1 gap-10 px-14 py-[44px] lg:grid-cols-[300px_1fr]"
		>
			<!-- ============ LEFT: CARD PREVIEW ============ -->
			<aside class="hidden lg:block">
				<div class="sticky top-[24px]">
					<!-- card preview — floating with a soft shadow for depth -->
					<div>
						<div class="relative aspect-[488/680] drop-shadow-[0_24px_42px_rgba(20,16,8,0.22)]">
							{#if selectedCard && selectedCardImage}
								{#if !previewImageLoaded && !previewImageError}
									<div class="absolute inset-0 flex items-center justify-center">
										<div class="border-line2 border-t-warm h-8 w-8 animate-spin rounded-full border-2"></div>
									</div>
								{/if}
								{#if previewImageError}
									<div class="absolute inset-0 flex items-center justify-center text-center">
										<div>
											<svg
												class="text-fade mx-auto mb-3 h-10 w-10"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>
											<p class="text-fade text-[12px] font-bold tracking-[0.05em] uppercase">
												Image unavailable
											</p>
										</div>
									</div>
								{/if}
								{#if previewCurrentUrl}
									{#key previewCurrentUrl}
										<img
											src={previewCurrentUrl}
											alt={selectedCard.name || selectedCard}
											class="h-full w-full object-contain transition-opacity duration-300 {previewImageLoaded ? 'opacity-100' : 'opacity-0'}"
											onload={handlePreviewLoad}
											onerror={handlePreviewError}
										/>
									{/key}
								{/if}
							{:else}
								<div class="absolute inset-0 flex items-center justify-center text-center">
									<div>
										<svg
											class="text-line2 mx-auto mb-3 h-10 w-10"
											fill="none"
											stroke="currentColor"
											stroke-width="1.5"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
											/>
										</svg>
										<p class="text-fade text-[12px] font-bold tracking-[0.05em] uppercase">
											Select a card to preview
										</p>
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!--
						Composition scorecard — moved here from the header so
						the dark cinematic band can stay focused on the title
						block + hero art, and the composition stats sit
						closer to the cards they describe.
					-->
					<div class="border-line2 bg-paper-bg border-warm mt-5 border border-t-[3px]">
						<div class="border-line2 border-b px-5 pt-3 pb-[10px]">
							<div class="text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
								Composition
							</div>
							<div class="font-newsreader text-ink mt-1 text-[22px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
								{totalCards}
								<span class="text-fade text-[14px] font-bold tracking-[0.04em] uppercase">
									cards
								</span>
							</div>
						</div>
						<div
							class="grid divide-x divide-[#C7BFA9] {groupedCards().colorless.length > 0
								? 'grid-cols-4'
								: 'grid-cols-3'}"
						>
							<div class="flex flex-col items-center px-3 py-3">
								<span
									class="font-newsreader text-[24px] leading-none font-semibold tabular-nums"
									style="color: #A8392C;"
								>
									{groupedCards().red.length}
								</span>
								<span
									class="mt-[6px] inline-flex items-center gap-[5px] text-[9.5px] font-extrabold tracking-[0.14em] uppercase"
									style="color: #A8392C;"
								>
									<span class="block h-[6px] w-[6px]" style="background-color: #A8392C;"></span>
									Red
								</span>
							</div>
							<div class="flex flex-col items-center px-3 py-3">
								<span
									class="font-newsreader text-[24px] leading-none font-semibold tabular-nums"
									style="color: #E5703E;"
								>
									{groupedCards().yellow.length}
								</span>
								<span
									class="mt-[6px] inline-flex items-center gap-[5px] text-[9.5px] font-extrabold tracking-[0.14em] uppercase"
									style="color: #E5703E;"
								>
									<span class="block h-[6px] w-[6px]" style="background-color: #E5703E;"></span>
									Yellow
								</span>
							</div>
							<div class="flex flex-col items-center px-3 py-3">
								<span
									class="font-newsreader text-[24px] leading-none font-semibold tabular-nums"
									style="color: #2C5BA8;"
								>
									{groupedCards().blue.length}
								</span>
								<span
									class="mt-[6px] inline-flex items-center gap-[5px] text-[9.5px] font-extrabold tracking-[0.14em] uppercase"
									style="color: #2C5BA8;"
								>
									<span class="block h-[6px] w-[6px]" style="background-color: #2C5BA8;"></span>
									Blue
								</span>
							</div>
							{#if groupedCards().colorless.length > 0}
								<div class="flex flex-col items-center px-3 py-3">
									<span
										class="font-newsreader text-soft text-[24px] leading-none font-semibold tabular-nums"
									>
										{groupedCards().colorless.length}
									</span>
									<span
										class="text-soft mt-[6px] inline-flex items-center gap-[5px] text-[9.5px] font-extrabold tracking-[0.14em] uppercase"
									>
										<span class="bg-soft block h-[6px] w-[6px]"></span>
										Colorless
									</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</aside>

			<!-- ============ RIGHT: CARD LIST ============ -->
			<div class="min-w-0">
				<!--
					Hero & Equipment — bordered card with the warm/rust
					top rule to anchor the "loadout" section. The same
					color treatment as the pitched cards below, but rust
					(the Hero accent) instead of red/yellow/blue.
				-->
				<div class="border-line2 bg-paper-bg border-t-warm mb-5 border border-t-[3px]">
					<div
						class="bg-paper text-ink flex items-baseline justify-between border-b border-[#C7BFA9] px-6 py-[12px] text-[12px] font-extrabold tracking-[0.18em] uppercase"
					>
						<span class="text-warm">Hero · Equipment</span>
						<span class="font-mono-system text-fade text-[12px] font-bold tracking-[0.05em]">
							{(decklist.hero ? 1 : 0) + groupedCards().equipment.length} pieces
						</span>
					</div>
					<div class="flex flex-wrap gap-x-9 px-6 py-3 sm:columns-2 sm:gap-x-9">
						{#if heroCard()}
							{@const _isSelected = selectedCard === heroCard()}
							<button
								type="button"
								onclick={() => {
									selectCard(heroCard());
									if (window.innerWidth < 1024) openCardModal(heroCard());
								}}
								class="border-line flex w-full cursor-pointer items-baseline gap-3 border-b py-[3px] text-left last:border-b-0 {_isSelected ? 'text-warm' : 'text-ink hover:text-warm'} transition-colors"
							>
								<span class="font-mono-system text-warm w-[26px] flex-shrink-0 text-[11px] font-extrabold tracking-[0.06em] uppercase">
									Hero
								</span>
								<span class="truncate text-[14.5px] font-extrabold">{decklist.hero}</span>
							</button>
						{/if}
						{#each groupedCards().equipment as card (card.name)}
							{@const _isSelected = selectedCard === card}
							<button
								type="button"
								onclick={() => {
									selectCard(card);
									if (window.innerWidth < 1024) openCardModal(card);
								}}
								class="border-line flex w-full cursor-pointer items-baseline gap-3 border-b py-[3px] text-left last:border-b-0 {_isSelected ? 'text-warm' : 'text-ink hover:text-warm'} transition-colors"
							>
								<span class="font-mono-system text-fade w-[26px] flex-shrink-0 text-[12px] font-bold tabular-nums">
									{card.quantity || 1}×
								</span>
								<span class="truncate text-[14px] font-bold">{card.name}</span>
							</button>
						{/each}
					</div>
				</div>

				<!--
					Pitched cards — each color section gets its own bordered
					card with a 3px colored top rule (Red / Yellow / Blue)
					so the color identity reads at a glance before you
					even read the label. Rows now get a tinted hover
					background in the matching color and an inline
					"selected" left-border accent on the active card.
				-->
				{#if columnLayout().columns.length > 0}
					{@const _COLOR_HEX = {
						red: '#A8392C',
						yellow: '#E5703E',
						blue: '#2C5BA8',
						colorless: '#56503F'
					}}
					{@const _activeCols = columnLayout().columns}
					<div
						class="grid grid-cols-1 gap-5 md:grid-cols-{_activeCols.length}"
					>
						{#each _activeCols as column, ci (ci)}
							<div class="space-y-5">
								{#each column as colorGroup, gi (colorGroup.key)}
									{@const _hex = _COLOR_HEX[colorGroup.key]}
									{@const _label = colorGroup.key.charAt(0).toUpperCase() + colorGroup.key.slice(1)}
									{@const _count = colorGroup.cards.reduce((s, c) => s + (c.quantity || 1), 0)}
									<div
										class="border-line2 bg-paper-bg border border-t-[3px] shadow-[0_1px_0_rgba(20,16,8,0.03)]"
										style="border-top-color: {_hex};"
									>
										<div
											class="bg-paper flex items-baseline justify-between border-b border-[#C7BFA9] px-6 py-[12px]"
										>
											<span
												class="text-[12px] font-extrabold tracking-[0.18em] uppercase"
												style="color: {_hex};"
											>
												{_label}
											</span>
											<span class="font-mono-system text-fade text-[12px] font-bold">
												{_count} cards
											</span>
										</div>
										<div class="px-3 py-[6px]">
											{#each colorGroup.cards as card (card.name)}
												{@const _isSelected = selectedCard === card}
												<button
													type="button"
													onclick={() => {
														selectCard(card);
														if (window.innerWidth < 1024) openCardModal(card);
													}}
													class="flex w-full cursor-pointer items-baseline gap-3 border-l-[3px] px-3 py-[4px] text-left transition-colors"
													style={_isSelected
														? `border-left-color: ${_hex}; background-color: color-mix(in srgb, ${_hex} 9%, transparent); color: ${_hex};`
														: `border-left-color: transparent;`}
													onmouseenter={(e) => {
														if (!_isSelected) {
															e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${_hex} 5%, transparent)`;
															e.currentTarget.style.color = _hex;
														}
													}}
													onmouseleave={(e) => {
														if (!_isSelected) {
															e.currentTarget.style.backgroundColor = '';
															e.currentTarget.style.color = '';
														}
													}}
												>
													<span
														class="font-mono-system w-[24px] flex-shrink-0 text-[12px] font-bold tabular-nums"
														style="color: {_isSelected ? _hex : 'var(--ed-fade)'};"
													>
														{card.quantity || 1}×
													</span>
													<span class="truncate text-[13.5px] font-bold">{card.name}</span>
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
</AgeShell>

<!-- ============ MOBILE CARD MODAL ============ -->
{#if showModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="Card preview"
		tabindex="-1"
	>
		<div class="relative w-full max-w-sm">
			<button
				type="button"
				onclick={closeModal}
				class="absolute -top-12 right-0 z-10 border border-white/30 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
				aria-label="Close modal"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			<div class="border-ink border bg-paper-bg">
				<div class="relative aspect-[488/680] bg-[#FBFAF6]">
					{#if modalCard && modalCardImage}
						{#if !modalImageLoaded && !modalImageError}
							<div class="absolute inset-0 flex items-center justify-center">
								<div class="border-line2 border-t-warm h-10 w-10 animate-spin rounded-full border-2"></div>
							</div>
						{/if}
						{#if modalImageError}
							<div class="absolute inset-0 flex items-center justify-center text-center">
								<div>
									<svg
										class="text-fade mx-auto mb-3 h-12 w-12"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
									<p class="text-fade text-[12px] font-bold tracking-[0.05em] uppercase">
										Image unavailable
									</p>
								</div>
							</div>
						{/if}
						{#if modalCurrentUrl}
							{#key modalCurrentUrl}
								<img
									src={modalCurrentUrl}
									alt={modalCard.name || modalCard}
									class="h-full w-full object-contain transition-opacity duration-300 {modalImageLoaded ? 'opacity-100' : 'opacity-0'}"
									onload={handleModalLoad}
									onerror={handleModalError}
								/>
							{/key}
						{/if}
					{/if}
				</div>
				{#if modalCard}
					<div class="border-line2 border-t px-4 py-3">
						<div class="font-newsreader text-ink text-[16px] font-semibold tracking-[-0.01em]">
							{modalCard.name || modalCard}
						</div>
						{#if modalCard.quantity > 1}
							<div class="text-fade font-mono-system mt-[2px] text-[10.5px] font-bold tracking-[0.05em]">
								{modalCard.quantity}× in deck
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
