<script>
	// Card images are now resolved server-side - no 12MB JSON import needed!
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import FormatTag from '$lib/components/age/FormatTag.svelte';
	import { heroImageUrl } from '$lib/heroImage.js';
	import { CIRCUITS } from '$lib/data/circuits.js';
	import { PITCH_STYLE } from '$lib/data/pitch.js';
	import CardLightbox from '$lib/components/age/CardLightbox.svelte';
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
			// Newer heroes can be missing from the card database; the site's
			// own hero portrait stands in so the preview is never blank.
			imageUrl: heroImage?.imageUrl || heroImageUrl(decklist.hero),
			fallbackUrl: heroImage?.fallbackUrl || heroImageUrl(decklist.hero)
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
		previewCurrentUrl = selectedCardImage?.imageUrl || selectedCardImage?.fallbackUrl || null;
		previewImageError = !previewCurrentUrl;
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

	const heroBackdrop = $derived(heroImageUrl(decklist.hero));

	// Pitch colours in the site's palette; the hero and equipment take the series blue
	const PITCH = {
		equipment: { label: 'Hero & equipment', hex: 'var(--ed-warm)' },
		...PITCH_STYLE
	};
	const SLUG = { 'Los Angeles': 'la', 'St. Louis': 'stl', 'New England': 'ne' };
	const ccVar = (name) => `var(--ed-cc-${SLUG[name] ?? 'la'})`;
	const abbr = (name) => CIRCUITS[name]?.abbreviation ?? name;
	const finishStyle = (n) =>
		n === 1
			? 'background: var(--ed-gold); color: #fff;'
			: n && n <= 8
				? 'background: var(--ed-warm-light); color: var(--ed-ink);'
				: 'border: 1px solid rgba(248,246,239,0.35); color: rgba(248,246,239,0.8);';
	const pitchOf = (card) => getCardCategory(card);
	const count = (cards) => cards.reduce((n, c) => n + (c.quantity || 1), 0);
	function pick(card) {
		selectCard(card);
		if (window.innerWidth < 1024) openCardModal(card);
	}

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

	function openCardModal(card) {
		modalCard = card;
		showModal = true;
	}

	// Every card in reading order, so the phone preview can step through the list
	const orderedCards = $derived([
		...(heroCard() ? [heroCard()] : []),
		...groupedCards().equipment,
		...columnLayout()
			.columns.flat()
			.flatMap((g) => g.cards)
	]);
	// Stored cards are reactive copies, so match on identity fields, not reference
	const cardId = (c) => (c ? `${c.isHero ? 'hero' : (c.section ?? '')}|${c.name}` : '');
	const modalIndex = $derived(
		modalCard ? orderedCards.findIndex((c) => cardId(c) === cardId(modalCard)) : -1
	);
	function stepModal(delta) {
		const n = orderedCards.length;
		if (!n || modalIndex < 0) return;
		const next = orderedCards[(modalIndex + delta + n) % n];
		selectCard(next);
		openCardModal(next);
	}

	function closeModal() {
		showModal = false;
	}
</script>

<svelte:head>
	<title>{decklist.hero || 'Deck'} · {decklist.playerName} — AGE Open decklist</title>
	<meta
		name="description"
		content="{decklist.playerName}'s {decklist.hero || 'deck'} from the {decklist.circuit ||
			'AGE'} Open{decklist.placement
			? `, ${getOrdinal(decklist.placement)} place`
			: ''}. Every card, with previews."
	/>
	{#if heroBackdrop}
		<link rel="preload" as="image" href={heroBackdrop} />
	{/if}
	{#if heroImage?.imageUrl}
		<link rel="preload" as="image" href={heroImage.imageUrl} />
	{/if}
</svelte:head>

<!--
	AGE Open decklist, in the series' "tournament day" register: an ink
	masthead with the hero as the headline and a composition strip, then
	a sticky card preview beside the list, section by section.
-->

<AgeShell active="AGE Open">
	<!-- ============ masthead ============ -->
	<section class="relative overflow-hidden bg-ink text-paper-bg">
		{#if heroBackdrop}
			<img
				src={heroBackdrop}
				alt=""
				aria-hidden="true"
				class="absolute inset-y-0 right-0 h-full w-full object-cover object-[75%_20%] md:w-[58%]"
				style="-webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 35%, #000 70%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 35%, #000 70%);"
				onerror={(e) => (e.currentTarget.style.display = 'none')}
			/>
		{/if}
		<div
			class="absolute inset-0"
			style="background: linear-gradient(100deg, rgba(23,21,15,0.98) 0%, rgba(23,21,15,0.92) 42%, rgba(23,21,15,0.35) 100%), linear-gradient(0deg, rgba(23,21,15,0.9) 0%, rgba(23,21,15,0) 40%);"
			aria-hidden="true"
		></div>

		<div class="relative mx-auto w-full max-w-[1200px] px-5 pt-8 md:px-8 md:pt-10">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<a
					href="/age-open?tab=decklists"
					class="text-[9.5px] font-extrabold tracking-[0.2em] text-paper-bg/60 uppercase transition-colors hover:text-paper-bg"
					>← Decklists</a
				>
				<button
					type="button"
					onclick={copyLink}
					class="text-[9.5px] font-extrabold tracking-[0.2em] uppercase transition-colors {linkCopied
						? 'text-prem'
						: 'text-paper-bg/60 hover:text-paper-bg'}"
					>{linkCopied ? 'Link copied ✓' : 'Copy link'}</button
				>
			</div>
			<a href="/age-open" class="mt-6 block w-fit" aria-label="AGE Open Series overview">
				<img
					src="/age_open_logo.svg"
					alt="AGE Open Series"
					width="629"
					height="294"
					class="h-auto w-[130px] md:w-[150px]"
				/>
			</a>

			<div class="fp-rise mt-8 max-w-[760px] md:mt-10">
				<p
					class="flex flex-wrap items-center gap-x-3 gap-y-2 text-[9.5px] font-extrabold tracking-[0.26em] text-paper-bg/60 uppercase"
				>
					Decklist
					{#if decklist.circuit}
						<span
							class="px-1.5 py-[3px] text-[8px] tracking-[0.16em] text-white"
							style="background: {ccVar(decklist.circuit)};">{abbr(decklist.circuit)}</span
						>
					{/if}
					<a href="/age-open/{decklist.eventId}" class="transition-colors hover:text-paper-bg"
						>{decklist.eventTitle || `${decklist.circuit || 'AGE'} Open`}</a
					>
					{#if decklist.eventDate}· {formatDate(decklist.eventDate)}{/if}
				</p>
				<h1
					class="ao-cond mt-3 text-[52px] leading-[0.86] font-black break-words uppercase md:text-[88px]"
				>
					{decklist.hero || 'Decklist'}
				</h1>
				<p class="mt-4 font-newsreader text-[22px] leading-tight text-paper-bg/85 md:text-[26px]">
					{#if decklist.gemId}
						<a href="/player/{decklist.gemId}" class="fp-ul">{decklist.playerName}</a>
					{:else}
						{decklist.playerName}
					{/if}
				</p>
				<div class="mt-5 flex flex-wrap items-center gap-3">
					{#if decklist.placement}
						<span
							class="px-2.5 py-1.5 text-[10px] font-extrabold tracking-[0.18em] uppercase"
							style={finishStyle(decklist.placement)}
						>
							{decklist.placement === 1 ? 'Champion' : `${getOrdinal(decklist.placement)} place`}
						</span>
					{/if}
					<FormatTag format={decklist.format} />
					{#if decklist.month}
						<span class="text-[10px] font-extrabold tracking-[0.18em] text-paper-bg/60 uppercase"
							>{formatMonth(decklist.month)} Open</span
						>
					{/if}
				</div>
			</div>

			<!-- composition strip -->
			<dl class="mt-9 grid grid-cols-3 border-t border-paper-bg/15 md:mt-10 md:grid-cols-6">
				{#each [{ v: totalCards, l: 'Cards', hex: 'var(--ed-warm-light)' }, { v: (decklist.hero ? 1 : 0) + groupedCards().equipment.length, l: 'Hero & gear', hex: null }, { v: count(groupedCards().red), l: 'Red', hex: PITCH.red.hex }, { v: count(groupedCards().yellow), l: 'Yellow', hex: PITCH.yellow.hex }, { v: count(groupedCards().blue), l: 'Blue', hex: PITCH.blue.hex }, { v: count(groupedCards().colorless), l: 'Colorless', hex: null }] as t, i (i)}
					<div
						class="border-r border-paper-bg/15 px-3 pt-4 pb-5 text-center md:px-4 md:pt-5 md:pb-6 md:last:border-r-0 [&:nth-child(3n)]:border-r-0 md:[&:nth-child(3n)]:border-r"
					>
						<dd
							class="ao-cond text-[34px] leading-none font-black tabular-nums md:text-[40px]"
							style={t.hex ? `color: ${t.hex};` : ''}
						>
							{t.v}
						</dd>
						<dt
							class="mt-2 text-[8.5px] font-extrabold tracking-[0.2em] text-paper-bg/55 uppercase"
						>
							{t.l}
						</dt>
					</div>
				{/each}
			</dl>
		</div>
	</section>

	<!-- ============ body ============ -->
	{#if cardsList.length === 0}
		<section class="mx-auto w-full max-w-[1200px] px-5 py-16 md:px-8">
			<div class="border border-line bg-paper px-6 py-14 text-center">
				<p class="ao-cond text-[32px] leading-none font-black uppercase">No cards yet</p>
				<p class="mx-auto mt-3 max-w-[420px] font-newsreader text-[15px] text-soft italic">
					This list hasn’t been filled in. Check back later or ask the tournament organiser.
				</p>
			</div>
		</section>
	{:else}
		<div
			class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-10 md:px-8 md:py-12 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-14"
		>
			<!-- preview -->
			<aside class="hidden lg:block">
				<div class="sticky top-[84px]">
					<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase">
						Card preview
					</p>
					<div class="relative mt-3 aspect-[488/680]">
						{#if selectedCard && selectedCardImage}
							{#if !previewImageLoaded && !previewImageError}
								<div class="absolute inset-0 flex items-center justify-center">
									<span class="h-6 w-6 animate-spin border-2 border-line2 border-t-warm"></span>
								</div>
							{/if}
							{#if previewImageError}
								<p
									class="absolute inset-0 flex items-center justify-center px-6 text-center text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>
									Image unavailable
								</p>
							{/if}
							{#if previewCurrentUrl}
								{#key previewCurrentUrl}
									<img
										src={previewCurrentUrl}
										alt={selectedCard.name || ''}
										class="h-full w-full {previewCurrentUrl.startsWith('/hero_images/')
											? 'object-cover object-[75%_20%]'
											: 'object-contain'} transition-opacity duration-300 {previewImageLoaded
											? 'opacity-100'
											: 'opacity-0'}"
										onload={handlePreviewLoad}
										onerror={handlePreviewError}
									/>
								{/key}
							{/if}
						{:else}
							<p
								class="absolute inset-0 flex items-center justify-center px-6 text-center text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>
								Select a card to preview
							</p>
						{/if}
					</div>
					{#if selectedCard}
						<div class="mt-4 border-t border-line pt-3">
							<p class="font-newsreader text-[17px] leading-tight font-semibold">
								{selectedCard.name}
							</p>
							<p
								class="mt-1 flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>
								{#if selectedCard.isHero}
									Hero
								{:else}
									<span
										class="h-2 w-2"
										style="background: {PITCH[pitchOf(selectedCard)].hex};"
										aria-hidden="true"
									></span>
									{PITCH[pitchOf(selectedCard)].label} · {selectedCard.quantity || 1}× in deck
								{/if}
							</p>
						</div>
					{/if}
				</div>
			</aside>

			<!-- list -->
			<div class="min-w-0">
				{#snippet row(card, hex, isHero = false)}
					{@const sel = selectedCard === card}
					<li class="border-b border-line">
						<button
							type="button"
							onclick={() => pick(card)}
							aria-pressed={sel}
							class="group flex w-full items-center gap-3 border-l-[3px] py-2 pr-2 pl-3 text-left transition-colors {sel
								? 'bg-paper'
								: 'hover:bg-paper'}"
							style="border-left-color: {sel ? hex : 'transparent'};"
						>
							<span
								class="ao-cond w-[30px] shrink-0 text-[20px] leading-none font-black tabular-nums"
								style="color: {sel ? hex : 'var(--ed-fade)'};"
							>
								{isHero ? 'H' : `${card.quantity || 1}×`}
							</span>
							<span
								class="min-w-0 flex-1 truncate font-newsreader text-[16px] leading-tight font-semibold"
								>{card.name}</span
							>
							<span
								class="shrink-0 text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase opacity-0 transition-opacity group-hover:opacity-100 {sel
									? 'opacity-100'
									: ''}">View</span
							>
						</button>
					</li>
				{/snippet}

				<!-- hero & equipment -->
				<section>
					<div class="flex items-end justify-between gap-3 border-b-[3px] border-ink pb-2">
						<h2
							class="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[0.2em] uppercase"
						>
							<span class="h-2.5 w-2.5 bg-warm" aria-hidden="true"></span>{PITCH.equipment.label}
						</h2>
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>{(decklist.hero ? 1 : 0) + groupedCards().equipment.length} pieces</span
						>
					</div>
					<ol class="grid sm:grid-cols-2 sm:gap-x-8">
						{#if heroCard()}
							{@render row(heroCard(), PITCH.equipment.hex, true)}
						{/if}
						{#each groupedCards().equipment as card (card.name)}
							{@render row(card, PITCH.equipment.hex)}
						{/each}
					</ol>
				</section>

				<!-- pitched cards -->
				{#if columnLayout().columns.length > 0}
					{@const cols = columnLayout().columns}
					<div class="mt-10 grid gap-x-8 gap-y-10 {cols.length > 1 ? 'md:grid-cols-2' : ''}">
						{#each cols as column, ci (ci)}
							<div class="space-y-10">
								{#each column as g (g.key)}
									<section>
										<div
											class="flex items-end justify-between gap-3 border-b-[3px] border-ink pb-2"
										>
											<h2
												class="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[0.2em] uppercase"
											>
												<span
													class="h-2.5 w-2.5"
													style="background: {PITCH[g.key].hex};"
													aria-hidden="true"
												></span>{PITCH[g.key].label}
											</h2>
											<span
												class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
												>{count(g.cards)} cards</span
											>
										</div>
										<ol>
											{#each g.cards as card (card.name)}
												{@render row(card, PITCH[g.key].hex)}
											{/each}
										</ol>
									</section>
								{/each}
							</div>
						{/each}
					</div>
				{/if}

				<p class="mt-10 font-newsreader text-[14px] text-fade italic">
					Tap any card to see it. Quantities are as submitted at registration.
				</p>
			</div>
		</div>
	{/if}
</AgeShell>

<!-- ============ phone card preview ============ -->
{#if showModal && modalCard}
	<CardLightbox
		card={{
			name: modalCard.name,
			imageUrl: modalCard.imageUrl,
			fallbackUrl: modalCard.fallbackUrl,
			label: modalCard.isHero ? 'Hero' : PITCH[pitchOf(modalCard)].label,
			hex: modalCard.isHero ? 'var(--ed-warm-light)' : PITCH[pitchOf(modalCard)].hex
		}}
		index={modalIndex}
		total={orderedCards.length}
		onstep={stepModal}
		onclose={closeModal}
	>
		{#snippet aside()}
			{#if !modalCard.isHero}
				<p class="shrink-0 text-right">
					<span class="ao-cond block text-[36px] leading-none font-black tabular-nums"
						>{modalCard.quantity || 1}×</span
					>
					<span class="text-[8px] font-extrabold tracking-[0.2em] text-paper-bg/55 uppercase"
						>in deck</span
					>
				</p>
			{/if}
		{/snippet}
	</CardLightbox>
{/if}
