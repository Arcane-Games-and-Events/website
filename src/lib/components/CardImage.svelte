<script>
	/**
	 * CardImage - Card image display component
	 *
	 * Usage (server resolves images, client just displays):
	 * <CardImage card={{ name: 'Snatch', imageUrl: '...', fallbackUrl: '...' }} />
	 * <CardImage imageUrl="..." fallbackUrl="..." alt="Card name" />
	 */

	// Props - accepts card object with pre-resolved URLs or direct URL props
	/** @type {{ name?: string, imageUrl?: string, fallbackUrl?: string } | null} */
	export let card = null;
	/** @type {string | null} */
	export let imageUrl = null;
	/** @type {string | null} */
	export let fallbackUrl = null;

	// Display options
	/** @type {string} */
	export let alt = '';
	/** @type {string} */
	export let className = '';
	/** @type {boolean} */
	export let showLoader = true;
	/** @type {boolean} */
	export let showError = true;

	// State
	let imageLoaded = false;
	let imageError = false;

	// Get URLs from card object or direct props
	$: currentUrl = card?.imageUrl || imageUrl;
	$: currentFallback = card?.fallbackUrl || fallbackUrl;
	$: computedAlt = alt || card?.name || 'Card';

	// Reset state when URL changes
	$: if (currentUrl) {
		imageLoaded = false;
		imageError = false;
	}

	function handleLoad() {
		imageLoaded = true;
		imageError = false;
	}

	function handleError() {
		// Try fallback if available
		if (currentFallback && currentUrl !== currentFallback) {
			currentUrl = currentFallback;
			imageLoaded = false;
			imageError = false;
		} else {
			imageError = true;
		}
	}
</script>

<div class="card-image-container aspect-[488/680] bg-gray-800 relative {className}">
	{#if showLoader && !imageLoaded && !imageError && currentUrl}
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/50 border-t-amber-500"></div>
		</div>
	{/if}

	{#if showError && imageError}
		<div class="absolute inset-0 flex items-center justify-center text-gray-500">
			<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
			</svg>
		</div>
	{/if}

	{#if currentUrl}
		<img
			src={currentUrl}
			alt={computedAlt}
			class="w-full h-full object-contain transition-opacity duration-200 {imageLoaded ? 'opacity-100' : 'opacity-0'}"
			on:load={handleLoad}
			on:error={handleError}
		/>
	{:else if !showError}
		<!-- No URL and not showing error - render nothing -->
	{:else}
		<div class="absolute inset-0 flex items-center justify-center text-gray-600">
			<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
			</svg>
		</div>
	{/if}
</div>
