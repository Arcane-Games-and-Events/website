<script>
	import { onMount, onDestroy } from 'svelte';
	import { getCardData } from '$lib/utils/fab-cards.js';

	/** @type {string} Card name to display */
	export let cardName;

	/** @type {string|null} Optional purchase URL */
	export let purchaseUrl = null;

	/** @type {number|undefined} Optional pitch value to disambiguate */
	export let pitch = undefined;

	/** @type {boolean} Show modal on mobile */
	let showModal = false;

	/** @type {boolean} Show tooltip on desktop */
	let showTooltip = false;

	/** @type {object|null} Card data */
	let cardData = null;

	/** @type {boolean} Is mobile device */
	let isMobile = false;

	/** @type {object} Tooltip position */
	let tooltipPosition = { x: 0, y: 0 };

	/** @type {HTMLElement|null} Reference to the trigger element */
	let triggerElement;

	onMount(() => {
		// Check if mobile
		isMobile = window.matchMedia('(max-width: 768px)').matches;

		// Load card data
		cardData = getCardData(cardName, { pitch });

		if (!cardData) {
			console.warn(`Card not found: ${cardName}`);
		}
	});

	function handleMouseEnter(event) {
		if (isMobile || !cardData) return;
		showTooltip = true;
		updateTooltipPosition(event);
	}

	function handleMouseMove(event) {
		if (isMobile || !showTooltip) return;
		updateTooltipPosition(event);
	}

	function handleMouseLeave() {
		if (isMobile) return;
		showTooltip = false;
	}

	function handleClick(event) {
		if (!cardData) return;

		if (isMobile) {
			event.preventDefault();
			showModal = true;
		} else if (purchaseUrl) {
			// Allow default link behavior to purchase URL
		} else {
			event.preventDefault();
		}
	}

	function updateTooltipPosition(event) {
		const offset = 20;
		const tooltipWidth = 300; // Approximate tooltip width
		const tooltipHeight = 420; // Approximate tooltip height

		let x = event.clientX + offset;
		let y = event.clientY + offset;

		// Keep tooltip on screen
		if (x + tooltipWidth > window.innerWidth) {
			x = event.clientX - tooltipWidth - offset;
		}
		if (y + tooltipHeight > window.innerHeight) {
			y = event.clientY - tooltipHeight - offset;
		}

		tooltipPosition = { x, y };
	}

	function closeModal() {
		showModal = false;
	}

	function handleKeyDown(event) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

<span class="inline">
	{#if purchaseUrl}
		<a
			href={purchaseUrl}
			class="text-orange-600 underline decoration-dotted cursor-pointer bg-transparent border-0 p-0 font-inherit transition-colors duration-200 hover:text-orange-500"
			on:mouseenter={handleMouseEnter}
			on:mousemove={handleMouseMove}
			on:mouseleave={handleMouseLeave}
			on:click={handleClick}
			bind:this={triggerElement}
		>
			<slot>{cardName}</slot>
		</a>
	{:else}
		<button
			type="button"
			class="text-orange-600 underline decoration-dotted cursor-pointer bg-transparent border-0 p-0 font-inherit transition-colors duration-200 hover:text-orange-500"
			on:mouseenter={handleMouseEnter}
			on:mousemove={handleMouseMove}
			on:mouseleave={handleMouseLeave}
			on:click={handleClick}
			bind:this={triggerElement}
		>
			<slot>{cardName}</slot>
		</button>
	{/if}
</span>

<!-- Desktop Tooltip -->
{#if showTooltip && cardData && !isMobile}
	<div
		class="fixed z-[9999] pointer-events-none"
		style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px;"
	>
		<div class="bg-gray-900 border-2 border-orange-600 rounded-xl p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
			{#if cardData.imageUrl}
				<img
					src={cardData.imageUrl}
					alt={cardData.name}
					class="w-[300px] h-auto block rounded-lg"
					loading="lazy"
				/>
			{:else}
				<div class="w-[300px] h-[400px] bg-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-500">
					<p>Image not available</p>
					<p class="font-semibold text-orange-600 mt-2">{cardData.name}</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Mobile Modal -->
{#if showModal && cardData && isMobile}
	<div class="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-5" on:click={closeModal} role="presentation">
		<div class="bg-gray-900 border-2 border-orange-600 rounded-2xl max-w-[500px] w-full max-h-[90vh] overflow-y-auto relative" on:click|stopPropagation role="dialog" aria-modal="true" aria-label={`Card: ${cardData.name}`}>
			<button class="absolute top-3 right-3 bg-black/50 border-0 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-white z-[1] transition-colors duration-200 hover:bg-black/70" on:click={closeModal} aria-label="Close">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
				</svg>
			</button>

			<div class="p-5">
				{#if cardData.imageUrl}
					<img
						src={cardData.imageUrl}
						alt={cardData.name}
						class="w-full h-auto rounded-lg mb-4"
					/>
				{:else}
					<div class="w-full aspect-[3/4] bg-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-500 mb-4">
						<p>{cardData.name}</p>
						<p class="text-sm">Image not available</p>
					</div>
				{/if}

				<div class="text-gray-200">
					<h3 class="m-0 mb-2 text-orange-600 text-xl">{cardData.name}</h3>
					{#if cardData.typeText}
						<p class="text-sm text-gray-500 my-1">{cardData.typeText}</p>
					{/if}
					{#if cardData.functionalText}
						<p class="my-3 leading-relaxed">{cardData.functionalText}</p>
					{/if}
				</div>

				{#if purchaseUrl}
					<a href={purchaseUrl} class="block w-full p-3 bg-orange-600 text-white text-center no-underline rounded-lg font-semibold mt-4 transition-colors duration-200 hover:bg-orange-500" target="_blank" rel="noopener noreferrer">
						Buy This Card
					</a>
				{/if}
			</div>
		</div>
	</div>
{/if}
