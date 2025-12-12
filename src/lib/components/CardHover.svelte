<script>
	/**
	 * CardHover - Hover tooltip and mobile modal for card links
	 *
	 * Automatically attaches to elements with class "card-link" and pre-resolved image URLs.
	 * - Desktop: Shows hover tooltip
	 * - Mobile: Shows modal on tap with optional external link button
	 *
	 * Required data attributes (server must resolve these):
	 * - data-card-name: Card name for display
	 * - data-card-image: Pre-resolved image URL
	 * - data-card-fallback: Optional fallback image URL
	 * - data-card-url: Optional custom URL for external link button
	 */

	import { onMount, onDestroy } from 'svelte';

	// Container element to search for card links (defaults to document)
	export let container = null;

	// Tooltip state (desktop hover)
	let tooltipVisible = false;
	let tooltipX = 0;
	let tooltipY = 0;

	// Modal state (mobile tap)
	let modalVisible = false;
	let modalCard = null;
	let modalUrl = null;
	let modalHasCustomUrl = false;
	let modalImageLoaded = false;
	let modalImageError = false;

	// Shared state
	let currentCard = null;
	let imageUrl = null;
	let fallbackUrl = null;
	let imageLoaded = false;
	let imageError = false;
	let listeners = [];

	// Detect if device supports touch
	let isTouchDevice = false;

	function handleMouseEnter(event) {
		// Skip hover on touch devices
		if (isTouchDevice) return;

		const link = event.currentTarget;
		const cardName = link.dataset.cardName;
		const cardImage = link.dataset.cardImage;
		const cardFallback = link.dataset.cardFallback;

		if (!cardName || !cardImage) return;

		currentCard = { name: cardName, imageUrl: cardImage, fallbackUrl: cardFallback };
		imageUrl = cardImage;
		fallbackUrl = cardFallback || null;
		imageLoaded = false;
		imageError = false;

		// Position tooltip
		const rect = link.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const tooltipWidth = 250;
		const tooltipHeight = 350;

		// Default: position to the right of the link
		let x = rect.right + 10;
		let y = rect.top;

		// If tooltip would go off right edge, position to the left
		if (x + tooltipWidth > viewportWidth - 20) {
			x = rect.left - tooltipWidth - 10;
		}

		// If still off screen (narrow viewport), center it
		if (x < 20) {
			x = Math.max(20, (viewportWidth - tooltipWidth) / 2);
		}

		// If tooltip would go off bottom, adjust y
		if (y + tooltipHeight > viewportHeight - 20) {
			y = viewportHeight - tooltipHeight - 20;
		}

		// Ensure y is not negative
		if (y < 20) {
			y = 20;
		}

		tooltipX = x;
		tooltipY = y;
		tooltipVisible = true;
	}

	function handleMouseLeave() {
		tooltipVisible = false;
		currentCard = null;
		imageUrl = null;
		fallbackUrl = null;
	}

	function handleClick(event) {
		// Only intercept on touch devices
		if (!isTouchDevice) return;

		const link = event.currentTarget;
		const cardName = link.dataset.cardName;
		const cardImage = link.dataset.cardImage;
		const cardFallback = link.dataset.cardFallback;
		const customUrl = link.dataset.cardUrl;

		if (!cardName || !cardImage) return;

		// Prevent default link behavior
		event.preventDefault();
		event.stopPropagation();

		modalCard = { name: cardName, imageUrl: cardImage, fallbackUrl: cardFallback };
		// Track if we have a custom URL
		modalHasCustomUrl = !!customUrl;
		// Use custom URL if provided, otherwise generate default fabtcg search URL
		modalUrl = customUrl || `https://cards.fabtcg.com/results/?q=${encodeURIComponent(cardName).replace(/%20/g, '+')}`;
		modalImageLoaded = false;
		modalImageError = false;
		modalVisible = true;
	}

	function closeModal() {
		modalVisible = false;
		modalCard = null;
		modalUrl = null;
		modalHasCustomUrl = false;
	}

	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Escape' && modalVisible) {
			closeModal();
		}
	}

	function handleImageLoad() {
		imageLoaded = true;
	}

	function handleImageError() {
		// Try fallback URL if available
		if (fallbackUrl && imageUrl !== fallbackUrl) {
			imageUrl = fallbackUrl;
			imageLoaded = false;
			imageError = false;
		} else {
			imageError = true;
		}
	}

	function handleModalImageLoad() {
		modalImageLoaded = true;
	}

	function handleModalImageError() {
		// Try fallback URL if available
		if (modalCard?.fallbackUrl && modalCard.imageUrl !== modalCard.fallbackUrl) {
			modalCard = { ...modalCard, imageUrl: modalCard.fallbackUrl };
			modalImageLoaded = false;
			modalImageError = false;
		} else {
			modalImageError = true;
		}
	}

	function attachListeners() {
		const target = container || document;
		const links = target.querySelectorAll('.card-link[data-card-name]');

		links.forEach(link => {
			link.addEventListener('mouseenter', handleMouseEnter);
			link.addEventListener('mouseleave', handleMouseLeave);
			link.addEventListener('click', handleClick);
			listeners.push({ element: link });
		});
	}

	function detachListeners() {
		listeners.forEach(({ element }) => {
			element.removeEventListener('mouseenter', handleMouseEnter);
			element.removeEventListener('mouseleave', handleMouseLeave);
			element.removeEventListener('click', handleClick);
		});
		listeners = [];
	}

	onMount(() => {
		// Detect touch device
		isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

		// Small delay to ensure DOM is ready after content renders
		setTimeout(attachListeners, 100);
	});

	onDestroy(() => {
		detachListeners();
	});

	// Re-attach listeners when container changes
	$: if (container) {
		detachListeners();
		setTimeout(attachListeners, 100);
	}
</script>

<!-- Desktop: Hover Tooltip -->
{#if tooltipVisible && imageUrl}
	<div
		class="fixed z-50 pointer-events-none"
		style="left: {tooltipX}px; top: {tooltipY}px;"
	>
		<div class="w-[250px] rounded-xl overflow-hidden shadow-2xl bg-gray-900 border border-white/10">
			<div class="aspect-[488/680] bg-gray-800 relative">
				{#if !imageLoaded && !imageError}
					<div class="absolute inset-0 flex items-center justify-center">
						<div class="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/50 border-t-amber-500"></div>
					</div>
				{/if}
				{#if imageError}
					<div class="absolute inset-0 flex items-center justify-center text-gray-500">
						<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
				{/if}
				<img
					src={imageUrl}
					alt={currentCard?.name || 'Card'}
					class="w-full h-full object-contain transition-opacity duration-200 {imageLoaded ? 'opacity-100' : 'opacity-0'}"
					on:load={handleImageLoad}
					on:error={handleImageError}
				/>
			</div>
		</div>
	</div>
{/if}

<!-- Mobile: Modal -->
{#if modalVisible && modalCard}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
		on:click={handleBackdropClick}
		on:keydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="Card preview"
		tabindex="-1"
	>
		<div class="relative w-full max-w-sm">
			<!-- Close Button -->
			<button
				on:click={closeModal}
				class="absolute -top-12 right-0 p-2 rounded-full bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-10"
				aria-label="Close modal"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			<!-- Card Image Container -->
			<div class="rounded-2xl overflow-hidden">
				<div class="aspect-[488/680] relative">
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
					{#if modalCard.imageUrl}
						<img
							src={modalCard.imageUrl}
							alt={modalCard.name || 'Card'}
							class="w-full h-full object-contain transition-opacity duration-300 {modalImageLoaded ? 'opacity-100' : 'opacity-0'}"
							on:load={handleModalImageLoad}
							on:error={handleModalImageError}
						/>
					{/if}
				</div>

				<!-- Link Button -->
				{#if modalUrl}
					<div class="pt-4">
						<a
							href={modalUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/40"
							on:click={closeModal}
						>
							<span>{modalHasCustomUrl ? 'Go to Link' : 'View Card'}</span>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
							</svg>
						</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
