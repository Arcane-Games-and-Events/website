<script>
	export let data;
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
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each data.events as evt}
					<article class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md overflow-hidden hover:shadow-lg transition-shadow">
						<div class="flex flex-col sm:flex-row">
							<!-- Image Placeholder -->
							<div class="w-full sm:w-64 h-48 bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
								<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</div>

							<!-- Content -->
							<div class="p-6 flex-1">
								<div class="flex gap-2 mb-2">
									<span class="px-2 py-1 text-xs rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium">
										Live Event
									</span>
								</div>

								<h2 class="text-xl font-semibold mb-2 text-[hsl(var(--foreground))]">
									{evt.title}
								</h2>

								<p class="text-[hsl(var(--muted-foreground))] mb-4">
									Join us for an exciting event. Register now to secure your spot!
								</p>

								<div class="flex items-center justify-between">
									<div class="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
										<div class="flex items-center gap-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											<span class="font-semibold text-[hsl(var(--foreground))]">${evt.price}</span>
										</div>
									</div>

									<a
										href="/events/{evt.id}/checkout"
										class="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
									>
										Register
									</a>
								</div>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</section>
