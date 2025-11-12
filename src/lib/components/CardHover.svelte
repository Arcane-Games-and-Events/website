<script>
	import { onMount } from 'svelte';

	let cardImage = null;
	let showCard = false;
	let mouseX = 0;
	let mouseY = 0;
	let isMobile = false;
	let mobileCardImage = null;
	let mobileCardUrl = null;

	// Card dimensions (approximate aspect ratio for FaB cards)
	const CARD_WIDTH = 250;
	const CARD_HEIGHT = 350;

	// Offset from cursor - position card to upper-right of cursor
	const OFFSET_X = 15; // Space to the right of cursor
	const OFFSET_Y = 15; // Space above the card bottom

	/**
	 * Fetch card image URL from cards.fabtcg.com
	 * @param {string} cardIdentifier - The card ID (e.g., "ARC077") or card name to search for
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

			// Otherwise, search for the card using cards.fabtcg.com API
			const searchUrl = `https://cards.fabtcg.com/api/search/v1/complete/card/${encodeURIComponent(cardIdentifier)}`;
			const response = await fetch(searchUrl);

			if (!response.ok) {
				console.error('Failed to fetch card data:', response.statusText);
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
		}
	}

	/**
	 * Close mobile card preview
	 */
	function closeMobilePreview() {
		mobileCardImage = null;
		mobileCardUrl = null;
	}

	/**
	 * Navigate to card URL (mobile)
	 */
	function navigateToCard() {
		if (mobileCardUrl) {
			window.open(mobileCardUrl, '_blank', 'noopener,noreferrer');
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
		class="card-preview"
		style="left: {position.left}px; top: {position.top}px;"
	>
		<img src={cardImage} alt="Card preview" />
	</div>
{/if}

<!-- Mobile Card Preview (Tap) -->
{#if mobileCardImage}
	<div
		class="mobile-card-overlay"
		role="button"
		tabindex="0"
		on:click={closeMobilePreview}
		on:keydown={(e) => e.key === 'Escape' && closeMobilePreview()}
	>
		<div
			class="mobile-card-container"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label="Card preview"
			on:click|stopPropagation
			on:keydown|stopPropagation
		>
			<button class="close-button" on:click={closeMobilePreview} aria-label="Close card preview">
				<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<img src={mobileCardImage} alt="Card preview" />
			{#if mobileCardUrl}
				<button class="view-card-button" on:click={navigateToCard}>
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
					View Full Card
				</button>
			{/if}
			<p class="tap-instruction">Tap outside to close</p>
		</div>
	</div>
{/if}

<style>
	/* Desktop hover preview */
	.card-preview {
		position: fixed;
		z-index: 9999;
		pointer-events: none;
		animation: fadeIn 0.15s ease-in-out;
	}

	.card-preview img {
		width: 250px;
		height: auto;
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
		border: 2px solid rgba(255, 255, 255, 0.15);
	}

	/* Mobile overlay */
	.mobile-card-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.85);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		animation: fadeIn 0.2s ease-in-out;
		backdrop-filter: blur(4px);
	}

	.mobile-card-container {
		position: relative;
		max-width: 90%;
		max-height: 90%;
		animation: scaleIn 0.2s ease-in-out;
	}

	.mobile-card-container img {
		width: 100%;
		max-width: 350px;
		height: auto;
		border-radius: 16px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
		border: 3px solid rgba(255, 255, 255, 0.2);
	}

	.close-button {
		position: absolute;
		top: -12px;
		right: -12px;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.95);
		color: #000;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		transition: transform 0.2s, background-color 0.2s;
		z-index: 1;
	}

	.close-button:hover {
		background-color: #fff;
		transform: scale(1.1);
	}

	.close-button:active {
		transform: scale(0.95);
	}

	.view-card-button {
		margin-top: 16px;
		padding: 12px 24px;
		background-color: rgba(255, 255, 255, 0.95);
		color: #000;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 15px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		width: 100%;
		max-width: 350px;
	}

	.view-card-button:hover {
		background-color: #fff;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
	}

	.view-card-button:active {
		transform: translateY(0);
	}

	.tap-instruction {
		text-align: center;
		color: rgba(255, 255, 255, 0.8);
		font-size: 14px;
		margin-top: 12px;
		font-weight: 500;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
