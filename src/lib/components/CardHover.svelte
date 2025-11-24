<script>
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { getCardData } from '$lib/utils/fab-cards.js';

	let cardImage = null;
	let showCard = false;
	let mouseX = 0;
	let mouseY = 0;
	let isMobile = false;
	let mobileCardImage = null;
	let mobileCardUrl = null;
	let mobileCardName = null;

	/**
	 * Check if the mobile card URL is a custom purchase link (not default search)
	 */
	function hasCustomPurchaseLink() {
		if (!mobileCardUrl) return false;
		// Default search URLs look like: https://cards.fabtcg.com/?search=CARDNAME
		return !mobileCardUrl.startsWith('https://cards.fabtcg.com/?search=');
	}

	/**
	 * Get the formatted search URL for cards.fabtcg.com
	 */
	function getSearchUrl(cardName) {
		// Remove pitch notation like [r], [y], [b]
		const cleanName = cardName.replace(/\[(r|red|y|yellow|b|blue)\]$/i, '').trim();
		// Replace spaces with + for the search query
		const searchQuery = cleanName.replace(/\s+/g, '+').toLowerCase();
		return `https://cards.fabtcg.com/results/?q=${searchQuery}`;
	}

	// Card dimensions (approximate aspect ratio for FaB cards)
	const CARD_WIDTH = 250;
	const CARD_HEIGHT = 350;

	// Offset from cursor - position card to upper-right of cursor
	const OFFSET_X = 15; // Space to the right of cursor
	const OFFSET_Y = 15; // Space above the card bottom

	/**
	 * Parse card identifier with pitch notation
	 * @param {string} cardIdentifier - e.g., "Snatch[r]", "Command and Conquer[b]", "Blade Runner"
	 * @returns {object} { cardName, pitch }
	 */
	function parseCardIdentifier(cardIdentifier) {
		// Match pitch notation: [r], [y], [b], [red], [yellow], [blue]
		const pitchMatch = cardIdentifier.match(/^(.+?)\[(r|red|y|yellow|b|blue)\]$/i);

		if (pitchMatch) {
			const cardName = pitchMatch[1].trim();
			const pitchNotation = pitchMatch[2].toLowerCase();

			// Map pitch notation to numeric values (as used by @flesh-and-blood/cards)
			let pitch;
			if (pitchNotation === 'r' || pitchNotation === 'red') {
				pitch = 1;
			} else if (pitchNotation === 'y' || pitchNotation === 'yellow') {
				pitch = 2;
			} else if (pitchNotation === 'b' || pitchNotation === 'blue') {
				pitch = 3;
			}

			return { cardName, pitch };
		}

		// No pitch notation - return card name as-is
		return { cardName: cardIdentifier.trim(), pitch: undefined };
	}

	/**
	 * Get card image URL using offline card database
	 * @param {string} cardIdentifier - The card name/ID with optional pitch notation
	 * @returns {Promise<string|null>} The card image URL or null
	 */
	async function fetchCardImage(cardIdentifier) {
		try {
			// Check if this looks like a card ID (alphanumeric pattern like ARC077, WTR001, etc)
			const cardIdPattern = /^[A-Z]{3,}\d{3}$/i;

			if (cardIdPattern.test(cardIdentifier)) {
				// Direct card ID - construct the image URL immediately
				return `https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/${cardIdentifier.toUpperCase()}.webp`;
			}

			// Parse pitch notation if present
			const { cardName, pitch } = parseCardIdentifier(cardIdentifier);

			// Use offline card database
			const cardData = getCardData(cardName, { pitch });

			if (cardData && cardData.imageUrl) {
				return cardData.imageUrl;
			}

			// Fallback: try API search if offline lookup fails
			const searchUrl = `https://cards.fabtcg.com/api/search/v1/complete/card/${encodeURIComponent(cardName)}`;
			const response = await fetch(searchUrl);

			if (!response.ok) {
				console.warn(`Card not found: ${cardName}${pitch ? ` (pitch ${pitch})` : ''}`);
				return null;
			}

			const data = await response.json();

			// Get the first matching card's identifier
			if (data && data.length > 0) {
				const cardId = data[0].identifier || data[0].id;
				if (cardId) {
					// Construct the image URL using the CloudFront CDN pattern
					return `https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/${cardId}.webp`;
				}
			}

			return null;
		} catch (error) {
			console.error('Error fetching card image:', error);
			return null;
		}
	}

	/**
	 * Handle mouse enter on card link (desktop)
	 */
	async function handleMouseEnter(event) {
		if (isMobile) return; // Skip on mobile

		const target = event.target.closest('[data-card-name]');
		if (!target) return;

		const cardName = target.getAttribute('data-card-name');
		if (!cardName) return;

		// Fetch card image
		const imageUrl = await fetchCardImage(cardName);
		if (imageUrl) {
			cardImage = imageUrl;
			showCard = true;
		}
	}

	/**
	 * Handle mouse leave on card link (desktop)
	 */
	function handleMouseLeave() {
		if (isMobile) return; // Skip on mobile

		showCard = false;
		cardImage = null;
	}

	/**
	 * Handle mouse move to update card position (desktop)
	 */
	function handleMouseMove(event) {
		if (isMobile) return; // Skip on mobile

		mouseX = event.clientX;
		mouseY = event.clientY;
	}

	/**
	 * Handle touch/click on card link (mobile)
	 */
	async function handleTouch(event) {
		if (!isMobile) return; // Skip on desktop

		const target = event.target.closest('[data-card-name]');
		if (!target) return;

		event.preventDefault();

		const cardName = target.getAttribute('data-card-name');
		const cardUrl = target.getAttribute('href');
		if (!cardName) return;

		// Fetch card image
		const imageUrl = await fetchCardImage(cardName);
		if (imageUrl) {
			mobileCardImage = imageUrl;
			mobileCardUrl = cardUrl || null;
			mobileCardName = cardName;
		}
	}

	/**
	 * Close mobile card preview
	 */
	function closeMobilePreview() {
		mobileCardImage = null;
		mobileCardUrl = null;
		mobileCardName = null;
	}

	/**
	 * Navigate to card URL (mobile)
	 */
	function navigateToCard() {
		let url;

		// If custom purchase link exists, use it; otherwise generate search URL
		if (hasCustomPurchaseLink()) {
			url = mobileCardUrl;
		} else if (mobileCardName) {
			url = getSearchUrl(mobileCardName);
		}

		if (url) {
			window.open(url, '_blank', 'noopener,noreferrer');
		}
	}

	/**
	 * Calculate card position to be upper-right of cursor
	 */
	function getCardPosition() {
		let left = mouseX + OFFSET_X;
		let top = mouseY - CARD_HEIGHT + OFFSET_Y;

		// Ensure card doesn't go off-screen on the right
		if (left + CARD_WIDTH > window.innerWidth) {
			left = mouseX - CARD_WIDTH - OFFSET_X; // Show on left side instead
		}

		// Ensure card doesn't go off-screen on the top
		if (top < 0) {
			top = OFFSET_Y;
		}

		return { left, top };
	}

	onMount(() => {
		// Detect if mobile device
		isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

		// Add event listeners to all card links
		if (!isMobile) {
			// Desktop: hover events
			document.addEventListener('mouseenter', handleMouseEnter, true);
			document.addEventListener('mouseleave', handleMouseLeave, true);
			document.addEventListener('mousemove', handleMouseMove);
		} else {
			// Mobile: touch events
			document.addEventListener('click', handleTouch, true);
		}

		// Cleanup
		return () => {
			document.removeEventListener('mouseenter', handleMouseEnter, true);
			document.removeEventListener('mouseleave', handleMouseLeave, true);
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('click', handleTouch, true);
		};
	});
</script>

<!-- Desktop Card Preview (Hover) -->
{#if showCard && cardImage && !isMobile}
	{@const position = getCardPosition()}
	<div
		class="fixed z-[9999] pointer-events-none"
		style="left: {position.left}px; top: {position.top}px;"
		transition:fade={{ duration: 200 }}
	>
		<img src={cardImage} alt="Card preview" class="w-[250px] h-auto rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] border-2 border-white/15" />
	</div>
{/if}

<!-- Mobile Card Preview (Tap) -->
{#if mobileCardImage}
	<div
		class="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-5 backdrop-blur-sm"
		role="button"
		tabindex="0"
		on:click={closeMobilePreview}
		on:keydown={(e) => e.key === 'Escape' && closeMobilePreview()}
		transition:fade={{ duration: 200 }}
	>
		<div
			class="relative max-w-[90%] max-h-[90%]"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label="Card preview"
			on:click|stopPropagation
			on:keydown|stopPropagation
			transition:scale={{ duration: 200, start: 0.9 }}
		>
			<button class="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white/95 text-black border-0 cursor-pointer flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all duration-200 hover:bg-white hover:scale-110 active:scale-95 z-[1]" on:click={closeMobilePreview} aria-label="Close card preview">
				<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<img src={mobileCardImage} alt="Card preview" class="w-full max-w-[350px] h-auto rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-[3px] border-white/20" />
			<button class="mt-4 p-3 px-6 bg-white/95 text-black border-0 rounded-lg font-semibold text-[15px] cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.3)] w-full max-w-[350px] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] active:translate-y-0" on:click={navigateToCard}>
				<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
				</svg>
				{hasCustomPurchaseLink() ? 'Buy this card' : 'View Full Card'}
			</button>
			<p class="text-center text-white/80 text-sm mt-3 font-medium">Tap outside to close</p>
		</div>
	</div>
{/if}
