<script>
	export let data;
</script>

<svelte:head>
	<title>Arcane Games and Events</title>
	<meta name="description" content="Your hub for gaming events, premium content, and community" />
</svelte:head>

<!-- Hero Section -->
<section class="relative overflow-hidden bg-gradient-to-b from-[hsl(var(--muted))] to-[hsl(var(--background))] py-12 sm:py-20 lg:py-32">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="text-center">
			<h1 class="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl mb-4 sm:mb-6">
				Welcome to <span class="text-[hsl(var(--primary))]">Arcane</span>
			</h1>
			<p class="text-base sm:text-lg lg:text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
				Your premier destination for gaming events, exclusive content, and a thriving community
			</p>
			<div class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-sm sm:max-w-none mx-auto px-4">
				<a
					href="/premium"
					class="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base text-[hsl(var(--primary-foreground))] font-semibold shadow-lg hover:opacity-90 transition-opacity text-center"
				>
					Get Premium
				</a>
				<a
					href="/events"
					class="rounded-[var(--radius)] bg-[hsl(var(--card))] border px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base text-[hsl(var(--card-foreground))] font-semibold shadow hover:bg-[hsl(var(--muted))] transition-colors text-center"
				>
					Browse Events
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Features Grid -->
<section class="py-12 sm:py-16 container mx-auto max-w-7xl px-4">
	<h2 class="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">What We Offer</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<!-- Feature Card 1 -->
		<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md p-6 hover:shadow-lg transition-shadow">
			<div class="w-full h-48 bg-[hsl(var(--muted))] rounded-[var(--radius)] mb-4 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
				<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
				</svg>
			</div>
			<h3 class="text-xl font-semibold mb-2">Premium Articles</h3>
			<p class="text-[hsl(var(--muted-foreground))]">
				Access exclusive content, strategy guides, and early releases from our expert writers
			</p>
		</div>

		<!-- Feature Card 2 -->
		<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md p-6 hover:shadow-lg transition-shadow">
			<div class="w-full h-48 bg-[hsl(var(--muted))] rounded-[var(--radius)] mb-4 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
				<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			</div>
			<h3 class="text-xl font-semibold mb-2">Gaming Events</h3>
			<p class="text-[hsl(var(--muted-foreground))]">
				Join tournaments, meetups, and special gaming events. Get early access with premium
			</p>
		</div>

		<!-- Feature Card 3 -->
		<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md p-6 hover:shadow-lg transition-shadow">
			<div class="w-full h-48 bg-[hsl(var(--muted))] rounded-[var(--radius)] mb-4 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
				<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
			</div>
			<h3 class="text-xl font-semibold mb-2">Courses & Training</h3>
			<p class="text-[hsl(var(--muted-foreground))]">
				Level up your skills with our comprehensive courses and training materials
			</p>
		</div>
	</div>
</section>

<!-- Latest Articles Section -->
<section class="py-12 sm:py-16 bg-[hsl(var(--muted)/0.3)]">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="flex flex-col sm:flex-row justify-between sm:items-center mb-6 sm:mb-8 gap-4">
			<h2 class="text-2xl sm:text-3xl font-bold">Latest Articles</h2>
			<a href="/articles" class="text-[hsl(var(--primary))] hover:underline font-semibold">
				View All →
			</a>
		</div>
		{#if data.articles && data.articles.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.articles as article}
					<article class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md overflow-hidden hover:shadow-lg transition-shadow">
						<a href="/articles/{article.slug}" class="block">
							<!-- Image Placeholder -->
							<div class="w-full h-48 bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
								<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
								</svg>
							</div>

							<!-- Content -->
							<div class="p-6">
								<!-- Premium Badge -->
								{#if article.isPremium}
									<div class="flex gap-2 mb-2">
										<span class="px-2 py-1 text-xs rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-medium">
											Premium
										</span>
									</div>
								{/if}

								<!-- Title -->
								<h3 class="text-xl font-semibold mb-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors line-clamp-2">
									{article.title}
								</h3>

								<!-- Excerpt -->
								{#if article.excerpt}
									<p class="text-[hsl(var(--muted-foreground))] mb-4 line-clamp-3">
										{article.excerpt}
									</p>
								{/if}

								<!-- Date -->
								{#if article.publishedAt}
									<div class="flex items-center justify-between">
										<time class="text-sm text-[hsl(var(--muted-foreground))]" datetime={article.publishedAt}>
											{new Date(article.publishedAt).toLocaleDateString('en-US', {
												year: 'numeric',
												month: 'short',
												day: 'numeric'
											})}
										</time>
										<span class="text-[hsl(var(--primary))] hover:underline font-medium text-sm">
											Read More →
										</span>
									</div>
								{/if}
							</div>
						</a>
					</article>
				{/each}
			</div>
		{:else}
			<div class="text-center py-12">
				<p class="text-lg text-[hsl(var(--muted-foreground))]">No articles available yet. Check back soon!</p>
			</div>
		{/if}
	</div>
</section>

<!-- Upcoming Events Section -->
<section class="py-12 sm:py-16">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="flex flex-col sm:flex-row justify-between sm:items-center mb-6 sm:mb-8 gap-4">
			<h2 class="text-2xl sm:text-3xl font-bold">Upcoming Events</h2>
			<a href="/events" class="text-[hsl(var(--primary))] hover:underline font-semibold">
				View All →
			</a>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each Array(2) as _, i}
				<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md overflow-hidden hover:shadow-lg transition-shadow">
					<div class="flex flex-col sm:flex-row">
						<div class="w-full sm:w-48 h-48 bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
							<span class="text-sm">Event Image</span>
						</div>
						<div class="p-6 flex-1">
							<div class="flex gap-2 mb-2">
								<span class="px-2 py-1 text-xs rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
									Live Event
								</span>
							</div>
							<h3 class="text-xl font-semibold mb-2">Tournament Event {i + 1}</h3>
							<p class="text-[hsl(var(--muted-foreground))] mb-4">
								Join us for an exciting tournament. Prizes, community, and great gameplay await!
							</p>
							<div class="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
								<div class="flex items-center gap-1">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									<span>Dec {15 + i}, 2024</span>
								</div>
								<div class="flex items-center gap-1">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
									<span>24 spots left</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="py-12 sm:py-16 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
	<div class="container mx-auto max-w-4xl px-4 text-center">
		<h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Ready to Level Up?</h2>
		<p class="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 opacity-90 max-w-2xl mx-auto">
			Join our premium membership for exclusive access to all content, events, and courses
		</p>
		<a
			href="/premium"
			class="inline-block rounded-[var(--radius)] bg-[hsl(var(--primary-foreground))] px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base text-[hsl(var(--primary))] font-semibold shadow-lg hover:opacity-90 transition-opacity"
		>
			Get Premium - $10/month
		</a>
	</div>
</section>
