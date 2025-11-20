<script>
	import { onMount } from 'svelte';
	export let data;

	let currentSlide = 0;
	const slides = [
		{
			title: 'Featured Tournament',
			subtitle: 'Championship Series',
			description: 'Join the ultimate gaming competition',
			image: null
		},
		{
			title: 'Premium Content',
			subtitle: 'Exclusive Access',
			description: 'Get access to expert guides and strategies',
			image: null
		},
		{
			title: 'Community Events',
			subtitle: 'Connect & Play',
			description: 'Participate in weekly gaming sessions',
			image: null
		}
	];

	function nextSlide() {
		currentSlide = (currentSlide + 1) % slides.length;
	}

	function prevSlide() {
		currentSlide = (currentSlide - 1 + slides.length) % slides.length;
	}

	function goToSlide(index) {
		currentSlide = index;
	}

	// Auto-advance carousel
	let carouselInterval;
	onMount(() => {
		carouselInterval = setInterval(nextSlide, 5000);
		return () => clearInterval(carouselInterval);
	});

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(date);
	}
</script>

<svelte:head>
	<title>Arcane Games and Events</title>
	<meta name="description" content="Your hub for gaming events, premium content, and community" />
</svelte:head>

<div class="min-h-screen bg-[hsl(var(--background))]">
	<!-- Main Content Container -->
	<div class="flex gap-6 px-4 sm:px-6 lg:px-8 py-6">
		<!-- Left Column - Main Content -->
		<div class="flex-1 min-w-0">
			<!-- Hero Carousel -->
			<section class="relative h-[400px] rounded-lg overflow-hidden mb-6 bg-gradient-to-r from-gray-900 to-gray-800">
				{#each slides as slide, i}
					<div
						class="absolute inset-0 transition-opacity duration-500"
						class:opacity-0={currentSlide !== i}
						class:opacity-100={currentSlide === i}
					>
						<div class="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent z-10"></div>
						{#if slide.image}
							<img src={slide.image} alt={slide.title} class="w-full h-full object-cover" />
						{:else}
							<div class="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center">
								<svg class="w-32 h-32 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</div>
						{/if}

						<div class="absolute inset-0 z-20 flex flex-col justify-center px-8 sm:px-12">
							<p class="text-[hsl(var(--secondary))] text-sm font-semibold mb-2 tracking-wide uppercase">
								{slide.subtitle}
							</p>
							<h2 class="text-4xl sm:text-5xl font-bold text-white mb-4 max-w-xl">
								{slide.title}
							</h2>
							<p class="text-gray-300 text-lg mb-6 max-w-md">
								{slide.description}
							</p>
							<button
								class="bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))]/90 text-white font-semibold px-6 py-3 rounded-lg transition-colors w-fit"
							>
								Learn More
							</button>
						</div>

						<!-- Thumbnail Previews -->
						<div class="absolute bottom-4 right-4 z-20 flex gap-2">
							{#each slides.slice(0, 3) as _, thumbIndex}
								<div class="w-16 h-16 rounded bg-gray-700/50 border border-gray-600 cursor-pointer hover:border-[hsl(var(--secondary))] transition-colors"></div>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Navigation Arrows -->
				<button
					on:click={prevSlide}
					class="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
					aria-label="Previous slide"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<button
					on:click={nextSlide}
					class="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
					aria-label="Next slide"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>

				<!-- Slide Indicators -->
				<div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
					{#each slides as _, i}
						<button
							on:click={() => goToSlide(i)}
							class="w-2 h-2 rounded-full transition-all"
							class:bg-[hsl(var(--secondary))]={currentSlide === i}
							class:bg-gray-500={currentSlide !== i}
							aria-label="Go to slide {i + 1}"
						></button>
					{/each}
				</div>
			</section>

			<!-- Latest Articles Section -->
			<section class="mb-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-2xl font-bold text-white">Latest Articles</h2>
					<select class="bg-[hsl(var(--card))] text-white border border-[hsl(var(--border))] rounded px-3 py-1.5 text-sm">
						<option>Popular</option>
						<option>Recent</option>
						<option>Trending</option>
					</select>
				</div>

				{#if data.articles && data.articles.length > 0}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{#each data.articles as article}
							<a href="/articles/{article.slug}" class="group block">
								<article class="bg-[hsl(var(--card))] rounded-lg overflow-hidden hover:ring-2 hover:ring-[hsl(var(--secondary))] transition-all">
									<!-- Article Image -->
									{#if article.coverImage}
										<div class="relative h-48 overflow-hidden">
											<img
												src={article.coverImage}
												alt={article.title}
												class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
											/>
											{#if article.isPremium}
												<div class="absolute top-2 left-2">
													<span class="bg-[hsl(var(--secondary))] text-white text-xs font-semibold px-2 py-1 rounded">
														Premium
													</span>
												</div>
											{/if}
										</div>
									{:else}
										<div class="h-48 bg-gray-800 flex items-center justify-center">
											<svg class="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
											</svg>
										</div>
									{/if}

									<!-- Article Content -->
									<div class="p-4">
										<h3 class="text-white font-semibold mb-2 line-clamp-2 group-hover:text-[hsl(var(--secondary))] transition-colors">
											{article.title}
										</h3>
										{#if article.excerpt}
											<p class="text-gray-400 text-sm mb-3 line-clamp-2">
												{article.excerpt}
											</p>
										{/if}
										<div class="flex items-center justify-between">
											{#if article.publishedAt}
												<time class="text-xs text-gray-500" datetime={article.publishedAt}>
													{formatDate(article.publishedAt)}
												</time>
											{/if}
											<button class="bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))]/90 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">
												Read Now
											</button>
										</div>
									</div>
								</article>
							</a>
						{/each}
					</div>
				{:else}
					<div class="bg-[hsl(var(--card))] rounded-lg p-12 text-center">
						<p class="text-gray-400">No articles available yet. Check back soon!</p>
					</div>
				{/if}
			</section>
		</div>

		<!-- Right Column - Sidebar -->
		<div class="hidden xl:block w-80 flex-shrink-0">
			<!-- Grey Placeholder Box -->
			<div class="bg-gray-800/50 rounded-lg h-[600px] border border-gray-700 flex items-center justify-center">
				<p class="text-gray-500 text-sm">Sidebar Content</p>
			</div>
		</div>
	</div>
</div>
