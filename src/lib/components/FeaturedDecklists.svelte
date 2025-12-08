<script>
	/**
	 * FeaturedDecklists - Displays winning decklists from recent events
	 */
	import DecklistCard from './DecklistCard.svelte';

	let { decklists = [], viewAllHref = '/age-open?tab=decklists' } = $props();
</script>

<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5 backdrop-blur-sm">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-white">Featured Decklists</h3>
		<a
			href={viewAllHref}
			class="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
		>
			View all
			<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</a>
	</div>

	{#if decklists.length > 0}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each decklists as decklist}
				<DecklistCard {decklist} />
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center gap-2 py-8">
			<svg class="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
				/>
			</svg>
			<p class="text-sm text-gray-400">No featured decklists yet</p>
			<p class="text-xs text-gray-500">Check back after events complete</p>
		</div>
	{/if}
</div>
