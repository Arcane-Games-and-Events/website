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
	<div class="flex gap-6 py-4">
		<!-- Left Column - Main Content -->
		<div class="min-w-0 flex-1">
			<!-- Hero Carousel -->
			<section
				class="relative mb-6 h-[400px] overflow-hidden rounded-lg bg-gradient-to-r from-gray-900 to-gray-800"
			>
				{#each slides as slide, i}
					<div
						class="absolute inset-0 transition-opacity duration-500"
						class:opacity-0={currentSlide !== i}
						class:opacity-100={currentSlide === i}
					>
						<div class="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-transparent"></div>
						{#if slide.image}
							<img src={slide.image} alt={slide.title} class="h-full w-full object-cover" />
						{:else}
							<div
								class="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black"
							>
								<svg
									class="h-32 w-32 text-gray-700"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
						{/if}

						<div class="absolute inset-0 z-20 flex flex-col justify-center px-16 sm:px-20 md:px-24">
							<p
								class="mb-2 text-sm font-semibold tracking-wide text-[hsl(var(--secondary))] uppercase"
							>
								{slide.subtitle}
							</p>
							<h2 class="mb-4 max-w-xl text-4xl font-bold text-white sm:text-5xl">
								{slide.title}
							</h2>
							<p class="mb-6 max-w-md text-lg text-gray-300">
								{slide.description}
							</p>
							<button
								class="w-fit rounded-lg bg-[hsl(var(--secondary))] px-6 py-3 font-semibold text-white transition-colors hover:bg-[hsl(var(--secondary))]/90"
							>
								Learn More
							</button>
						</div>
					</div>
				{/each}

				<!-- Navigation Arrows -->
				<button
					on:click={prevSlide}
					class="absolute top-1/2 left-2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70 sm:left-4"
					aria-label="Previous slide"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
				<button
					on:click={nextSlide}
					class="absolute top-1/2 right-2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70 sm:right-4"
					aria-label="Next slide"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>

				<!-- Slide Indicators -->
				<div class="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2">
					{#each slides as _, i}
						<button
							on:click={() => goToSlide(i)}
							class="h-2 w-2 rounded-full transition-all"
							class:bg-[hsl(var(--secondary))]={currentSlide === i}
							class:bg-gray-500={currentSlide !== i}
							aria-label="Go to slide {i + 1}"
						></button>
					{/each}
				</div>
			</section>

			<!-- Latest Articles Section -->
			<section class="mb-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-2xl font-bold text-white">Latest Articles</h2>
					<select
						class="rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-sm text-white"
					>
						<option>Popular</option>
						<option>Recent</option>
						<option>Trending</option>
					</select>
				</div>

				{#if data.articles && data.articles.length > 0}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
						{#each data.articles as article}
							<a href="/read/{article.slug}" class="group block">
								<article
									class="overflow-hidden rounded-lg transition-all hover:ring-2 hover:ring-[hsl(var(--secondary))]"
								>
									<!-- Article Image -->
									{#if article.coverImage}
										<div class="relative h-48 overflow-hidden">
											<img
												src={article.coverImage}
												alt={article.title}
												class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
											<div class="absolute top-2 left-2">
												<span
													class="rounded-full px-2.5 py-1 text-xs font-semibold capitalize backdrop-blur-sm
													{article.isPremium || article.accessMode?.toLowerCase() === 'premium'
														? 'bg-green-500 text-green-900 shadow-lg'
														: 'border border-gray-600/50 bg-gray-900/80 text-gray-100'}"
												>
													{article.accessMode}
												</span>
											</div>
										</div>
									{:else}
										<div class="relative flex h-48 items-center justify-center bg-gray-800">
											<svg
												class="h-16 w-16 text-gray-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
												/>
											</svg>
											<div class="absolute top-2 left-2">
												<span
													class="rounded-full px-2.5 py-1 text-xs font-semibold capitalize backdrop-blur-sm
													{article.isPremium || article.accessMode?.toLowerCase() === 'premium'
														? 'bg-green-900 text-green-300 shadow-lg'
														: 'border border-gray-600/50 bg-gray-900/80 text-gray-100'}"
												>
													{article.accessMode}
												</span>
											</div>
										</div>
									{/if}

									<!-- Article Content -->
									<div class="p-4">
										<h3
											class="mb-2 line-clamp-2 font-semibold text-white transition-colors group-hover:text-[hsl(var(--secondary))]"
										>
											{article.title}
										</h3>

										{#if article.excerpt}
											<p class="mb-3 line-clamp-2 text-sm text-gray-400">
												{article.excerpt}
											</p>
										{/if}
										<div class="flex items-center justify-between">
											{#if article.publishedAt}
												<time class="text-xs text-gray-500" datetime={article.publishedAt}>
													{formatDate(article.publishedAt)}
												</time>
											{/if}
											<button
												class="rounded bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[hsl(var(--secondary))]/90"
											>
												Read Now
											</button>
										</div>
									</div>
								</article>
							</a>
						{/each}
					</div>
				{:else}
					<div class="rounded-lg bg-[hsl(var(--card))] p-12 text-center">
						<p class="text-gray-400">No articles available yet. Check back soon!</p>
					</div>
				{/if}
			</section>
		</div>

		<!-- Right Column - Sidebar -->
		<div class="hidden w-80 flex-shrink-0 xl:block">
			<!-- Grey Placeholder Box -->
			<div
				class="flex h-[600px] items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50"
			>
				<p class="text-sm text-gray-500">Sidebar Content</p>
			</div>
		</div>
	</div>
</div>
