<script>
	export let data;

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(date);
	}

	function formatPrice(price) {
		return parseFloat(price).toFixed(2);
	}
</script>

<svelte:head>
	<title>Events - Arcane Games and Events</title>
</svelte:head>

<!-- Page Header -->
<section class="relative overflow-hidden bg-gradient-to-b from-[hsl(var(--muted))] to-[hsl(var(--background))] py-12 sm:py-16">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="text-center">
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
				Events
			</h1>
			<p class="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
				Join us for tournaments, meetups, and special gaming events
			</p>
		</div>
	</div>
</section>

<!-- Events Grid -->
<section class="py-12">
	<div class="container mx-auto max-w-7xl px-4">
		{#if data.events.length === 0}
			<div class="text-center py-12">
				<div class="w-24 h-24 mx-auto mb-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
					<svg class="w-12 h-12 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
				</div>
				<h2 class="text-2xl font-bold mb-2 text-[hsl(var(--foreground))]">No Events Yet</h2>
				<p class="text-lg text-[hsl(var(--muted-foreground))]">Check back soon for upcoming events!</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{#each data.events as evt}
					<article class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md overflow-hidden hover:shadow-lg transition-shadow">
						<div class="p-6">
							<!-- Header with badges -->
							<div class="flex flex-wrap gap-2 mb-3">
								{#if evt.format}
									<span class="px-2 py-1 text-xs rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium">
										{evt.format}
									</span>
								{/if}
								{#if evt.circuit}
									<span class="px-2 py-1 text-xs rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] font-medium">
										{evt.circuit}
									</span>
								{/if}
								{#if evt.premiumDiscount}
									<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
										10% Premium Discount
									</span>
								{/if}
							</div>

							<!-- Title -->
							<h2 class="text-xl font-semibold mb-3 text-[hsl(var(--foreground))]">
								{evt.title}
							</h2>

							<!-- Event Details -->
							<div class="space-y-2 mb-4">
								<!-- Date & Time -->
								{#if evt.eventDate}
									<div class="flex items-start gap-2 text-sm text-[hsl(var(--muted-foreground))]">
										<svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										<span>{formatDate(evt.eventDate)}</span>
									</div>
								{/if}

								<!-- Location -->
								{#if evt.location}
									<div class="flex items-start gap-2 text-sm text-[hsl(var(--muted-foreground))]">
										<svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
										<span>{evt.location}</span>
									</div>
								{/if}

								<!-- Gem ID Required -->
								{#if evt.gemIdRequired}
									<div class="flex items-start gap-2 text-sm text-[hsl(var(--muted-foreground))]">
										<svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
										</svg>
										<span>Gem ID Required</span>
									</div>
								{/if}
							</div>

							<!-- Description -->
							{#if evt.description}
								<p class="text-sm text-[hsl(var(--muted-foreground))] mb-4 line-clamp-2">
									{evt.description}
								</p>
							{/if}

							<!-- Footer with price and action -->
							<div class="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
								<div class="flex items-center gap-2">
									<svg class="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span class="text-lg font-bold text-[hsl(var(--foreground))]">
										${formatPrice(evt.price)}
									</span>
								</div>

								<a
									href="/events/{evt.id}/checkout"
									class="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
								>
									Register
								</a>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</section>
