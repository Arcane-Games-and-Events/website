<script>
	import FadeImage from '$lib/components/FadeImage.svelte';
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import ArticlePreview from '$lib/components/ArticlePreview.svelte';
	import { onMount, onDestroy } from 'svelte';
	export let data;

	// Get unique tags from all articles
	$: allTags = [
		...new Set(data.articles.flatMap((article) => article.tags || []).map((tag) => tag.name))
	].sort();

	// Filter state
	let selectedAccessType = 'all'; // 'all', 'free', 'premium'
	let selectedTag = null;

	// All articles sorted newest to oldest
	$: allArticles = [...data.articles].sort(
		(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
	);

	// Featured articles for carousel (top 3)
	$: carouselArticles = allArticles.slice(0, 3);

	// Filtered articles (all articles, including carousel ones)
	$: filteredArticles = allArticles.filter((article) => {
		// Filter by access type
		if (selectedAccessType === 'free' && article.isPremium) return false;
		if (selectedAccessType === 'premium' && !article.isPremium) return false;

		// Filter by tag
		if (selectedTag) {
			const articleTags = (article.tags || []).map((tag) => tag.name);
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
		const minutes = Math.max(3, Math.ceil((words * 5) / 200));
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
	<meta
		name="description"
		content="Strategy guides, deck techs, and the latest news for Flesh and Blood TCG"
	/>
</svelte:head>

<div class="min-h-screen">
	<!-- Hero Carousel Section -->
	{#if carouselArticles.length > 0}
		<section class="relative">
			<!-- Carousel Banner -->
			<div
				class="relative min-h-[320px] overflow-hidden bg-gray-900 md:min-h-[420px] lg:min-h-[500px]"
			>
				{#each carouselArticles as article, index}
					<div
						class="absolute inset-0 transition-opacity duration-700 ease-in-out {index ===
						currentSlide
							? 'z-10 opacity-100'
							: 'z-0 opacity-0'}"
					>
						<!-- Background Image - positioned to right 2/3 on desktop -->
						<div class="absolute inset-0 lg:left-1/3">
							{#if article.coverImage?.src}
								<FadeImage
									src={article.coverImage.src}
									srcset={article.coverImage.srcset}
									sizes="100vw"
									alt=""
									class="h-full w-full"
									loading={index === 0 ? 'eager' : 'lazy'}
								/>
							{:else}
								<div class="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
							{/if}
						</div>
						<!-- Gradient overlays -->
						<!-- Mobile: standard gradient from left -->
						<div
							class="absolute inset-0 bg-gradient-to-r from-gray-950/90 from-20% via-gray-950/70 via-50% to-gray-950/30 to-80% lg:hidden"
						></div>
						<!-- Desktop: solid bg on left, smooth fade into image -->
						<div
							class="absolute inset-0 hidden bg-gradient-to-r from-gray-950 from-[34%] via-gray-950/50 via-[55%] to-transparent to-[85%] lg:block"
						></div>
						<!-- Bottom fade for both -->
						<div
							class="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"
						></div>

						<!-- Accent glow in upper left (desktop only) -->
						<div class="absolute inset-0 hidden overflow-hidden lg:block">
							<div
								class="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-blue-500/15 blur-[150px]"
							></div>
							<div
								class="absolute top-[5%] left-[10%] h-[350px] w-[350px] rounded-full bg-purple-600/12 blur-[120px]"
							></div>
						</div>

						<!-- Content -->
						<div class="relative z-10 flex h-full items-center">
							<div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:py-12 lg:px-8 lg:py-16">
								<div class="max-w-xl lg:max-w-2xl">
									<!-- Category/Tag -->
									<div class="mb-2 flex items-center gap-2 md:mb-4 md:gap-3">
										{#if article.tags && article.tags.length > 0}
											<span
												class="text-[10px] font-bold tracking-wider text-blue-400 uppercase md:text-sm"
											>
												{article.tags[0].name}
											</span>
										{/if}
										{#if article.isPremium}
											<span
												class="flex items-center gap-1 rounded-full bg-emerald-600/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm md:text-xs"
											>
												<svg
													class="h-2.5 w-2.5 md:h-3 md:w-3"
													fill="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														fill-rule="evenodd"
														d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
														clip-rule="evenodd"
													/>
												</svg>
												Premium
											</span>
										{:else if article.accessMode === 'Premium' || article.accessMode === 'premium'}
											<span
												class="flex items-center gap-1 rounded-full bg-blue-600/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm md:text-xs"
											>
												<svg
													class="h-2.5 w-2.5 md:h-3 md:w-3"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
													/>
												</svg>
												Now Free
											</span>
										{:else}
											<span
												class="rounded-full bg-gray-800/70 px-2 py-0.5 text-[10px] font-medium text-gray-300 backdrop-blur-sm md:text-xs"
											>
												Free
											</span>
										{/if}
									</div>

									<!-- Title -->
									<h1
										class="mb-2 line-clamp-2 text-xl leading-tight font-bold text-white drop-shadow-lg md:mb-4 md:line-clamp-none md:text-3xl lg:text-4xl"
									>
										{article.title}
									</h1>

									<!-- Excerpt -->
									{#if article.excerpt}
										<p
											class="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-300 drop-shadow-md md:mb-5 md:text-base"
										>
											{article.excerpt}
										</p>
									{/if}

									<!-- Meta -->
									<div class="mb-4 flex items-center gap-3 md:mb-6">
										{#if article.author}
											<div class="flex items-center gap-2">
												{#if article.author.profilePicture}
													<img
														src={article.author.profilePicture}
														alt={article.author.name}
														class="h-7 w-7 rounded-full object-cover ring-2 ring-white/20 md:h-9 md:w-9"
													/>
												{:else}
													<div
														class="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white/20 md:h-9 md:w-9"
													>
														<span class="text-xs font-bold text-white md:text-sm">
															{article.author.name.charAt(0)}
														</span>
													</div>
												{/if}
												<div>
													<a
														href="/articles/author/{article.author.slug}"
														class="block text-xs font-semibold text-white transition-colors hover:text-blue-400 md:text-sm"
														on:click|stopPropagation
													>
														{article.author.name}
													</a>
													<span class="text-[10px] text-gray-400 md:text-sm">
														{formatDate(article.publishedAt)} · {getReadTime(article)}
													</span>
												</div>
											</div>
										{/if}
									</div>

									<!-- Read Now Button -->
									<a
										href="/articles/{article.slug}"
										class="group/btn inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 md:gap-2.5 md:px-6 md:py-3"
									>
										Read Now
										<svg
											class="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
											/>
										</svg>
									</a>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Progress Bar -->
			{#if carouselArticles.length > 1}
				<div class="relative h-1 bg-gray-800">
					<div
						class="absolute inset-y-0 left-0 bg-blue-500 transition-colors duration-300"
						style="width: {progress}%"
					></div>
				</div>

				<!-- Carousel Navigation Previews -->
				<div class="border-t border-gray-800 bg-gray-900/95">
					<div class="grid grid-cols-3">
						{#each carouselArticles as article, index}
							<button
								on:click={() => goToSlide(index)}
								class="relative border-b-2 p-2 text-left transition-all duration-300 md:p-4 {index ===
								currentSlide
									? 'border-blue-500'
									: 'border-transparent hover:border-blue-500/50'} group"
							>
								<div class="flex items-center gap-2 md:gap-3">
									<!-- Thumbnail -->
									<div
										class="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg md:h-12 md:w-12"
									>
										{#if article.coverImage?.src}
											<img
												src={article.coverImage.src}
												alt=""
												class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
											/>
										{:else}
											<div
												class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20"
											>
												<svg
													class="h-5 w-5 text-gray-500"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="1.5"
														d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
													/>
												</svg>
											</div>
										{/if}
									</div>

									<!-- Text Content -->
									<div class="min-w-0 flex-1">
										<h3
											class="line-clamp-1 text-[10px] font-semibold transition-colors md:text-xs lg:text-sm {index ===
											currentSlide
												? 'text-blue-400'
												: 'text-white group-hover:text-blue-400'}"
										>
											{article.title}
										</h3>
										<p class="mt-0.5 truncate text-[9px] text-gray-500 md:text-[10px]">
											{article.author?.name || 'AGE'} · {getReadTime(article)}
										</p>
									</div>
								</div>

								<!-- Active indicator dot -->
								{#if index === currentSlide}
									<div
										class="absolute top-1.5 right-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 md:top-2 md:right-2 md:h-2 md:w-2"
									></div>
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
					<div
						class="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent sm:w-32 sm:flex-none"
					></div>
				</div>

				<!-- Compact Filters -->
				<div class="flex flex-wrap items-center gap-3">
					<!-- Access Type Pills -->
					<div class="flex rounded-lg bg-gray-800/50 p-1">
						<button
							on:click={() => (selectedAccessType = 'all')}
							class="rounded-md px-3 py-1.5 text-xs font-medium transition-all {selectedAccessType ===
							'all'
								? 'bg-white text-gray-900'
								: 'text-gray-400 hover:text-white'}"
						>
							All
						</button>
						<button
							on:click={() => (selectedAccessType = 'free')}
							class="rounded-md px-3 py-1.5 text-xs font-medium transition-all {selectedAccessType ===
							'free'
								? 'bg-white text-gray-900'
								: 'text-gray-400 hover:text-white'}"
						>
							Free
						</button>
						<button
							on:click={() => (selectedAccessType = 'premium')}
							class="rounded-md px-3 py-1.5 text-xs font-medium transition-all {selectedAccessType ===
							'premium'
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
							class="rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						>
							<option value={null} class="bg-gray-800 text-white">All Topics</option>
							{#each allTags as tag}
								<option value={tag} class="bg-gray-800 text-white">{tag}</option>
							{/each}
						</select>
					{/if}

					<!-- Clear Filters -->
					<button
						on:click={clearFilters}
						class="text-xs font-medium text-gray-400 transition-all hover:text-white {selectedAccessType !==
							'all' || selectedTag
							? 'opacity-100'
							: 'pointer-events-none opacity-0'}"
					>
						Clear
					</button>
				</div>
			</div>

			<!-- Articles Grid -->
			{#if filteredArticles.length > 0}
				<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each filteredArticles as article}
						<ArticlePreview {article} variant="featured" />
					{/each}
				</div>
			{:else if allArticles.length === 0}
				<div class="py-12 text-center">
					<p class="text-gray-400">More articles coming soon!</p>
				</div>
			{:else}
				<div class="py-12 text-center">
					<p class="text-gray-400">No articles match your filters.</p>
					<button
						on:click={clearFilters}
						class="mt-2 text-blue-400 transition-colors hover:text-blue-300"
					>
						Clear filters
					</button>
				</div>
			{/if}

			<!-- Load More (placeholder for future pagination) -->
			{#if filteredArticles.length > 6}
				<div class="mt-12 text-center">
					<button
						class="rounded-xl border border-white/10 bg-white/5 px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10"
					>
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
					<svg
						class="mx-auto h-16 w-16 text-gray-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
						/>
					</svg>
					<h2 class="mt-6 text-2xl font-bold text-white">No articles yet</h2>
					<p class="mt-2 text-gray-400">
						Check back soon for strategy guides, deck techs, and the latest Flesh and Blood news.
					</p>
				</div>
			</div>
		</section>
	{/if}
</div>
