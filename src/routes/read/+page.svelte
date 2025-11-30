<script>
	import FadeImage from '$lib/components/FadeImage.svelte';
	import { onMount, onDestroy } from 'svelte';
	export let data;

	// Get unique tags from all articles
	$: allTags = [...new Set(data.articles.flatMap(article => article.tags || []).map(tag => tag.name))].sort();

	// Filter state
	let selectedAccessType = 'all'; // 'all', 'free', 'premium'
	let selectedTag = null;

	// All articles sorted newest to oldest
	$: allArticles = [...data.articles].sort((a, b) =>
		new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
	);

	// Featured articles for carousel (top 3)
	$: carouselArticles = allArticles.slice(0, 3);

	// Filtered articles (all articles, including carousel ones)
	$: filteredArticles = allArticles.filter(article => {
		// Filter by access type
		if (selectedAccessType === 'free' && article.isPremium) return false;
		if (selectedAccessType === 'premium' && !article.isPremium) return false;

		// Filter by tag
		if (selectedTag) {
			const articleTags = (article.tags || []).map(tag => tag.name);
			if (!articleTags.includes(selectedTag)) return false;
		}

		return true;
	});

	// Carousel state
	let currentSlide = 0;
	let progress = 0;
	let animationId;
	const slideDuration = 20000; // 20 seconds per slide
	let lastTimestamp = 0;

	function goToSlide(index) {
		currentSlide = index;
		progress = 0;
		lastTimestamp = 0;
	}

	function nextSlide() {
		currentSlide = (currentSlide + 1) % carouselArticles.length;
		progress = 0;
		lastTimestamp = 0;
	}

	function animateProgress(timestamp) {
		if (!lastTimestamp) lastTimestamp = timestamp;
		const elapsed = timestamp - lastTimestamp;
		progress = Math.min((elapsed / slideDuration) * 100, 100);

		if (progress >= 100) {
			nextSlide();
		}

		animationId = requestAnimationFrame(animateProgress);
	}

	onMount(() => {
		if (carouselArticles.length > 1) {
			animationId = requestAnimationFrame(animateProgress);
		}
	});

	onDestroy(() => {
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
	});

	// Get reading time from CMS-calculated value, with fallback estimation
	function getReadTime(article) {
		if (article.readTime) {
			return `${article.readTime} min read`;
		}
		// Fallback: estimate from excerpt if readTime not yet calculated
		const words = article.excerpt ? article.excerpt.split(/\s+/).length : 0;
		const minutes = Math.max(3, Math.ceil(words * 5 / 200));
		return `${minutes} min read`;
	}

	// Format date
	function formatDate(dateStr) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Clear filters
	function clearFilters() {
		selectedAccessType = 'all';
		selectedTag = null;
	}
</script>

<svelte:head>
	<title>Read - AGE</title>
	<meta name="description" content="Strategy guides, deck techs, and the latest news for Flesh and Blood TCG" />
</svelte:head>

<div class="min-h-screen">
	<!-- Hero Carousel Section -->
	{#if carouselArticles.length > 0}
		<section class="relative">
			<!-- Carousel Banner -->
			<div class="relative overflow-hidden bg-gray-900 min-h-[320px] md:min-h-[420px] lg:min-h-[500px]">
				{#each carouselArticles as article, index}
					<div
						class="absolute inset-0 transition-opacity duration-700 ease-in-out {index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}"
					>
						<!-- Background Image -->
						<div class="absolute inset-0">
							{#if article.coverImage}
								<FadeImage
									src={article.coverImage}
									alt=""
									class="h-full w-full object-cover"
									loading={index === 0 ? "eager" : "lazy"}
								/>
							{:else}
								<div class="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
							{/if}
							<!-- Gradient overlay -->
							<div class="absolute inset-0 bg-gradient-to-r from-gray-950/90 from-20% via-gray-950/70 via-50% to-gray-950/30 to-80%"></div>
							<div class="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
						</div>

						<!-- Content -->
						<div class="relative z-10 h-full flex items-center px-4 md:px-8 lg:px-12 py-6 md:py-12 lg:py-16">
							<div class="max-w-xl lg:max-w-2xl">
								<!-- Category/Tag -->
								<div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
									{#if article.tags && article.tags.length > 0}
										<span class="text-[10px] md:text-sm font-bold uppercase tracking-wider text-blue-400">
											{article.tags[0].name}
										</span>
									{/if}
									{#if article.isPremium}
										<span class="flex items-center gap-1 text-[10px] md:text-sm font-semibold text-emerald-400">
											<svg class="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
												<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
											</svg>
											Premium
										</span>
									{/if}
								</div>

								<!-- Title -->
								<h1 class="text-xl md:text-3xl lg:text-4xl font-bold leading-tight text-white mb-2 md:mb-4 drop-shadow-lg line-clamp-2 md:line-clamp-none">
									{article.title}
								</h1>

								<!-- Excerpt -->
								{#if article.excerpt}
									<p class="text-sm md:text-base text-gray-300 leading-relaxed line-clamp-2 drop-shadow-md mb-3 md:mb-5">
										{article.excerpt}
									</p>
								{/if}

								<!-- Meta -->
								<div class="flex items-center gap-3 mb-4 md:mb-6">
									{#if article.author}
										<div class="flex items-center gap-2">
											{#if article.author.profilePicture}
												<img
													src={article.author.profilePicture}
													alt={article.author.name}
													class="h-7 w-7 md:h-9 md:w-9 rounded-full object-cover ring-2 ring-white/20"
												/>
											{:else}
												<div class="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white/20">
													<span class="text-xs md:text-sm font-bold text-white">
														{article.author.name.charAt(0)}
													</span>
												</div>
											{/if}
											<div>
												<a
													href="/read/author/{article.author.slug}"
													class="block text-xs md:text-sm font-semibold text-white hover:text-blue-400 transition-colors"
													on:click|stopPropagation
												>
													{article.author.name}
												</a>
												<span class="text-[10px] md:text-sm text-gray-400">
													{formatDate(article.publishedAt)} · {getReadTime(article)}
												</span>
											</div>
										</div>
									{/if}
								</div>

								<!-- Read Now Button -->
								<a
									href="/read/{article.slug}"
									class="group/btn inline-flex items-center gap-1.5 md:gap-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 md:px-6 py-2 md:py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
								>
									Read Now
									<svg class="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
									</svg>
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Progress Bar -->
			{#if carouselArticles.length > 1}
				<div class="h-1 bg-gray-800 relative">
					<div
						class="absolute inset-y-0 left-0 bg-blue-500 transition-colors duration-300"
						style="width: {progress}%"
					></div>
				</div>

				<!-- Carousel Navigation Previews -->
				<div class="bg-gray-900/95 border-t border-gray-800">
					<div class="grid grid-cols-3">
						{#each carouselArticles as article, index}
							<button
								on:click={() => goToSlide(index)}
								class="relative p-2 md:p-4 text-left transition-all duration-300 border-b-2 {index === currentSlide
									? 'border-blue-500'
									: 'border-transparent hover:border-blue-500/50'} group"
							>
								<div class="flex items-center gap-2 md:gap-3">
									<!-- Thumbnail -->
									<div class="relative h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-lg overflow-hidden">
										{#if article.coverImage}
											<img
												src={article.coverImage}
												alt=""
												class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
											/>
										{:else}
											<div class="h-full w-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
												<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
												</svg>
											</div>
										{/if}
									</div>

									<!-- Text Content -->
									<div class="min-w-0 flex-1">
										<h3 class="font-semibold text-[10px] md:text-xs lg:text-sm transition-colors line-clamp-1 {index === currentSlide ? 'text-blue-400' : 'text-white group-hover:text-blue-400'}">
											{article.title}
										</h3>
										<p class="text-[9px] md:text-[10px] text-gray-500 truncate mt-0.5">
											{article.author?.name || 'AGE'} · {getReadTime(article)}
										</p>
									</div>
								</div>

								<!-- Active indicator dot -->
								{#if index === currentSlide}
									<div class="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50"></div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}

	<!-- The Latest Section -->
	<section class="py-12">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<!-- Section Header with Filters -->
			<div class="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-4">
					<h2 class="text-2xl font-bold text-white">The Latest</h2>
					<div class="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent sm:w-32 sm:flex-none"></div>
				</div>

				<!-- Compact Filters -->
				<div class="flex flex-wrap items-center gap-3">
					<!-- Access Type Pills -->
					<div class="flex rounded-lg bg-gray-800/50 p-1">
						<button
							on:click={() => selectedAccessType = 'all'}
							class="rounded-md px-3 py-1.5 text-xs font-medium transition-all {selectedAccessType === 'all'
								? 'bg-white text-gray-900'
								: 'text-gray-400 hover:text-white'}"
						>
							All
						</button>
						<button
							on:click={() => selectedAccessType = 'free'}
							class="rounded-md px-3 py-1.5 text-xs font-medium transition-all {selectedAccessType === 'free'
								? 'bg-white text-gray-900'
								: 'text-gray-400 hover:text-white'}"
						>
							Free
						</button>
						<button
							on:click={() => selectedAccessType = 'premium'}
							class="rounded-md px-3 py-1.5 text-xs font-medium transition-all {selectedAccessType === 'premium'
								? 'bg-emerald-500 text-white'
								: 'text-gray-400 hover:text-white'}"
						>
							Premium
						</button>
					</div>

					<!-- Tag Dropdown -->
					{#if allTags.length > 0}
						<select
							bind:value={selectedTag}
							class="rounded-lg border border-white/10 bg-gray-800/50 px-3 py-2 text-xs font-medium text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						>
							<option value={null}>All Topics</option>
							{#each allTags as tag}
								<option value={tag}>{tag}</option>
							{/each}
						</select>
					{/if}

					<!-- Clear Filters -->
					<button
						on:click={clearFilters}
						class="text-xs font-medium text-gray-400 hover:text-white transition-all {selectedAccessType !== 'all' || selectedTag ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
					>
						Clear
					</button>
				</div>
			</div>

			<!-- Articles Grid -->
			{#if filteredArticles.length > 0}
				<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{#each filteredArticles as article}
						<a href="/read/{article.slug}" class="group block">
							<article class="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-gray-800/50 hover:shadow-xl hover:shadow-black/20">
								<!-- Image -->
								<div class="relative h-44 shrink-0 overflow-hidden">
									{#if article.coverImage}
										<FadeImage
											src={article.coverImage}
											alt={article.title}
											class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
									{:else}
										<div class="flex h-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
											<svg class="h-12 w-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
											</svg>
										</div>
									{/if}
									<div class="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
									<!-- Access Badge -->
									<div class="absolute top-3 left-3">
										<span class="rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm
											{article.isPremium
												? 'bg-emerald-500 text-white'
												: 'border border-white/20 bg-gray-900/70 text-gray-100'}">
											{article.isPremium ? 'Premium' : 'Free'}
										</span>
									</div>
								</div>

								<!-- Content -->
								<div class="flex flex-1 flex-col p-4">
									<!-- Tags -->
									{#if article.tags && article.tags.length > 0}
										<div class="relative mb-2 overflow-hidden">
											<div class="flex gap-2 overflow-hidden whitespace-nowrap" style="mask-image: linear-gradient(to right, black 85%, transparent 100%); -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);">
												{#each article.tags as tag}
													<span class="shrink-0 text-xs font-semibold uppercase tracking-wider text-blue-400">
														{tag.name}
													</span>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Title -->
									<h3 class="mb-2 text-base font-bold text-white leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
										{article.title}
									</h3>

									<!-- Excerpt -->
									{#if article.excerpt}
										<p class="mb-3 text-sm text-gray-400 line-clamp-2 flex-1">
											{article.excerpt}
										</p>
									{:else}
										<div class="flex-1"></div>
									{/if}

									<!-- Meta Footer -->
									<div class="mt-auto flex items-center gap-2 pt-3 border-t border-white/5">
										{#if article.author}
											{#if article.author.profilePicture}
												<img
													src={article.author.profilePicture}
													alt={article.author.name}
													class="h-6 w-6 rounded-full object-cover ring-1 ring-white/10"
												/>
											{:else}
												<div class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-1 ring-white/10">
													<span class="text-[10px] font-bold text-blue-400">{article.author.name.charAt(0)}</span>
												</div>
											{/if}
											<span class="text-xs font-medium text-gray-300 truncate">{article.author.name}</span>
											<span class="text-gray-600">·</span>
										{/if}
										<span class="text-xs text-gray-500">{formatDate(article.publishedAt)}</span>
										<span class="text-gray-600">·</span>
										<span class="text-xs text-gray-500">{getReadTime(article)}</span>
									</div>
								</div>
							</article>
						</a>
					{/each}
				</div>
			{:else if allArticles.length === 0}
				<div class="py-12 text-center">
					<p class="text-gray-400">More articles coming soon!</p>
				</div>
			{:else}
				<div class="py-12 text-center">
					<p class="text-gray-400">No articles match your filters.</p>
					<button on:click={clearFilters} class="mt-2 text-blue-400 hover:text-blue-300 transition-colors">
						Clear filters
					</button>
				</div>
			{/if}

			<!-- Load More (placeholder for future pagination) -->
			{#if filteredArticles.length > 6}
				<div class="mt-12 text-center">
					<button class="rounded-xl border border-white/10 bg-white/5 px-8 py-3 font-semibold text-white hover:bg-white/10 transition-colors">
						Load More
					</button>
				</div>
			{/if}
		</div>
	</section>

	<!-- No Articles State -->
	{#if data.articles.length === 0}
		<section class="py-24">
			<div class="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
				<div class="mx-auto max-w-md">
					<svg class="mx-auto h-16 w-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
					</svg>
					<h2 class="mt-6 text-2xl font-bold text-white">No articles yet</h2>
					<p class="mt-2 text-gray-400">Check back soon for strategy guides, deck techs, and the latest Flesh and Blood news.</p>
				</div>
			</div>
		</section>
	{/if}
</div>
