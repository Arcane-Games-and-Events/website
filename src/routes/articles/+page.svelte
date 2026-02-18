<script>
	import FadeImage from '$lib/components/FadeImage.svelte';
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import ArticlePreview from '$lib/components/ArticlePreview.svelte';
	import { onMount, onDestroy, tick } from 'svelte';
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

	// Separate premium and free articles
	$: premiumArticles = filteredArticles.filter((a) => a.isPremium);
	$: freeArticles = filteredArticles.filter((a) => !a.isPremium);

	// View mode: 'separated' or 'all'
	let viewMode = 'separated';

	// Pagination state
	let premiumPage = 1;
	let freePage = 1;
	let allPage = 1;
	const ITEMS_PER_PAGE_GROUPED = 6;
	const ITEMS_PER_PAGE_ALL = 9;

	// Reset pagination when filters change
	$: if (selectedTag || selectedAccessType) {
		premiumPage = 1;
		freePage = 1;
		allPage = 1;
	}

	// Reset pagination when view mode changes
	$: if (viewMode) {
		premiumPage = 1;
		freePage = 1;
		allPage = 1;
	}

	// Paginated articles for each section (show only current page's items)
	$: paginatedPremiumArticles = premiumArticles.slice(
		(premiumPage - 1) * ITEMS_PER_PAGE_GROUPED,
		premiumPage * ITEMS_PER_PAGE_GROUPED
	);
	$: paginatedFreeArticles = freeArticles.slice(
		(freePage - 1) * ITEMS_PER_PAGE_GROUPED,
		freePage * ITEMS_PER_PAGE_GROUPED
	);
	$: paginatedAllArticles = filteredArticles.slice(
		(allPage - 1) * ITEMS_PER_PAGE_ALL,
		allPage * ITEMS_PER_PAGE_ALL
	);

	// Total pages for each section
	$: totalPremiumPages = Math.ceil(premiumArticles.length / ITEMS_PER_PAGE_GROUPED);
	$: totalFreePages = Math.ceil(freeArticles.length / ITEMS_PER_PAGE_GROUPED);
	$: totalAllPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE_ALL);

	// Scroll to section top when paginating
	async function scrollToSection(elementId) {
		await tick(); // Wait for Svelte to update the DOM
		const element = document.getElementById(elementId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	// Page navigation functions
	async function goToPremiumPage(page) {
		premiumPage = page;
		await scrollToSection('premium-articles');
	}

	async function goToFreePage(page) {
		freePage = page;
		await scrollToSection('free-articles');
	}

	async function goToAllPage(page) {
		allPage = page;
		await scrollToSection('all-articles');
	}

	// Generate page numbers for pagination
	function getPageNumbers(currentPage, totalPages) {
		const pages = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			if (currentPage <= 3) {
				for (let i = 1; i <= 4; i++) pages.push(i);
				pages.push('...');
				pages.push(totalPages);
			} else if (currentPage >= totalPages - 2) {
				pages.push(1);
				pages.push('...');
				for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
			} else {
				pages.push(1);
				pages.push('...');
				for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
				pages.push('...');
				pages.push(totalPages);
			}
		}
		return pages;
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
		<section class="relative px-4 pt-6 sm:px-6 lg:px-8">
			<div class="mx-auto max-w-7xl">
				<!-- Carousel Banner -->
				<div
					class="relative min-h-[260px] overflow-hidden bg-gray-900 md:min-h-[340px] lg:min-h-[380px] {carouselArticles.length >
					1
						? 'rounded-t-2xl'
						: 'rounded-2xl'}"
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
								<div class="w-full px-4 py-6 sm:px-6 md:py-12 lg:px-8 lg:py-16">
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
					<div class="overflow-hidden rounded-b-2xl border-t border-gray-800 bg-gray-900/95">
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
			</div>
		</section>
	{/if}

	<!-- The Latest Section -->
	<section class="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
		<div class="mx-auto max-w-7xl">
			<!-- Filter Bar -->
			<div class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<!-- Left: Tag Filter -->
				<div class="flex items-center gap-3">
					<label for="tag-filter" class="text-sm font-medium text-gray-400">Topic:</label>
					<div class="relative">
						<select
							id="tag-filter"
							bind:value={selectedTag}
							class="appearance-none rounded-lg border border-white/10 bg-gray-800/80 py-2 pr-10 pl-4 text-sm font-medium text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
						>
							<option value={null}>All Topics</option>
							{#each allTags as tag}
								<option value={tag}>{tag}</option>
							{/each}
						</select>
						<svg
							class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M19.5 8.25l-7.5 7.5-7.5-7.5"
							/>
						</svg>
					</div>
					{#if selectedTag}
						<button
							on:click={() => (selectedTag = null)}
							class="text-sm text-gray-400 transition-colors hover:text-white"
						>
							Clear
						</button>
					{/if}
				</div>

				<!-- Right: View Toggle + Count -->
				<div class="flex items-center gap-4">
					<!-- View Toggle -->
					<div class="flex rounded-lg bg-gray-800/50 p-1">
						<button
							on:click={() => (viewMode = 'separated')}
							class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all {viewMode ===
							'separated'
								? 'bg-white text-gray-900'
								: 'text-gray-400 hover:text-white'}"
						>
							<svg
								class="h-3.5 w-3.5"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z"
								/>
							</svg>
							Grouped
						</button>
						<button
							on:click={() => (viewMode = 'all')}
							class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all {viewMode ===
							'all'
								? 'bg-white text-gray-900'
								: 'text-gray-400 hover:text-white'}"
						>
							<svg
								class="h-3.5 w-3.5"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
								/>
							</svg>
							All
						</button>
					</div>

					<!-- Article Count -->
					<span class="text-sm text-gray-500">
						{filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
					</span>
				</div>
			</div>

			<!-- Articles Grid -->
			{#if filteredArticles.length > 0}
				{#if viewMode === 'all'}
					<!-- All Articles View -->
					<div
						id="all-articles"
						class="grid scroll-mt-20 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
					>
						{#each paginatedAllArticles as article, i (article.slug + '-' + allPage)}
							<div class="article-card-animate" style="animation-delay: {i * 50}ms">
								<a href="/articles/{article.slug}" class="group block">
									<article>
										<!-- Image -->
										<div class="relative mb-4 aspect-video overflow-hidden rounded-lg bg-gray-800">
											{#if article.coverImage?.src}
												<img
													src={article.coverImage.src}
													srcset={article.coverImage.srcset}
													sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
													alt=""
													class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
													loading="lazy"
												/>
											{/if}
											<!-- Badge -->
											{#if article.isPremium}
												<div class="absolute top-2 left-2">
													<span
														class="inline-flex items-center gap-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
													>
														<svg class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
															<path
																fill-rule="evenodd"
																d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
																clip-rule="evenodd"
															/>
														</svg>
														PREMIUM
													</span>
												</div>
											{:else if article.isFreeNow}
												<div class="absolute top-2 left-2">
													<span
														class="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
														>FREE NOW</span
													>
												</div>
											{/if}
										</div>
										<!-- Content -->
										{#if article.tags?.[0]}
											{#if article.isPremium}
												<span class="text-xs font-bold tracking-wide text-emerald-400 uppercase"
													>{article.tags[0].name}</span
												>
											{:else}
												<span class="text-xs font-bold tracking-wide text-blue-400 uppercase"
													>{article.tags[0].name}</span
												>
											{/if}
										{/if}
										{#if article.isPremium}
											<h3
												class="mt-1 font-display text-lg leading-snug font-bold text-white transition-colors group-hover:text-emerald-400"
											>
												{article.title}
											</h3>
										{:else}
											<h3
												class="mt-1 font-display text-lg leading-snug font-bold text-white transition-colors group-hover:text-blue-400"
											>
												{article.title}
											</h3>
										{/if}
										{#if article.excerpt}
											<p class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-400">
												{article.excerpt}
											</p>
										{/if}
										<div class="mt-3 flex items-center gap-2 text-sm text-gray-500">
											{#if article.author?.profilePicture}
												<img
													src={article.author.profilePicture}
													alt=""
													class="h-5 w-5 rounded-full object-cover"
												/>
											{/if}
											{#if article.author}
												<span class="text-gray-400">{article.author.name}</span>
												<span class="text-gray-600">·</span>
											{/if}
											<span>{formatDate(article.publishedAt)}</span>
										</div>
									</article>
								</a>
							</div>
						{/each}
					</div>

					<!-- All Articles Pagination -->
					{#if totalAllPages > 1}
						<div class="mt-10 flex items-center justify-center gap-2">
							<button
								on:click={() => goToAllPage(allPage - 1)}
								disabled={allPage === 1}
								aria-label="Previous page"
								class="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<svg
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15.75 19.5L8.25 12l7.5-7.5"
									/>
								</svg>
							</button>
							{#each getPageNumbers(allPage, totalAllPages) as page}
								{#if page === '...'}
									<span class="px-2 text-gray-500">...</span>
								{:else}
									<button
										on:click={() => goToAllPage(page)}
										class="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors {page ===
										allPage
											? 'border-blue-500 bg-blue-500 text-white'
											: 'border-white/10 bg-white/5 text-white hover:bg-white/10'}"
									>
										{page}
									</button>
								{/if}
							{/each}
							<button
								on:click={() => goToAllPage(allPage + 1)}
								disabled={allPage === totalAllPages}
								aria-label="Next page"
								class="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<svg
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M8.25 4.5l7.5 7.5-7.5 7.5"
									/>
								</svg>
							</button>
						</div>
					{/if}
				{:else}
					<!-- Separated View -->
					<!-- Premium Articles Section -->
					{#if premiumArticles.length > 0}
						<div id="premium-articles" class="mb-12 scroll-mt-20">
							<!-- Section Header -->
							<div class="mb-6 flex items-center gap-3">
								<div class="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5">
									<svg class="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
										<path
											fill-rule="evenodd"
											d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
											clip-rule="evenodd"
										/>
									</svg>
									<span class="text-sm font-bold text-emerald-400">Premium</span>
								</div>
								<div class="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent"></div>
								<span class="text-sm text-gray-500"
									>{premiumArticles.length} article{premiumArticles.length !== 1 ? 's' : ''}</span
								>
							</div>

							<!-- Premium Grid -->
							<div class="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
								{#each paginatedPremiumArticles as article, i (article.slug + '-' + premiumPage)}
									<div class="article-card-animate" style="animation-delay: {i * 50}ms">
										<a href="/articles/{article.slug}" class="group block">
											<article>
												<!-- Image -->
												<div
													class="relative mb-4 aspect-video overflow-hidden rounded-lg bg-gray-800 ring-1 ring-emerald-500/20"
												>
													{#if article.coverImage?.src}
														<img
															src={article.coverImage.src}
															srcset={article.coverImage.srcset}
															sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
															alt=""
															class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
															loading="lazy"
														/>
													{/if}
												</div>
												<!-- Content -->
												{#if article.tags?.[0]}
													<span class="text-xs font-bold tracking-wide text-emerald-400 uppercase">
														{article.tags[0].name}
													</span>
												{/if}
												<h3
													class="mt-1 font-display text-lg leading-snug font-bold text-white transition-colors group-hover:text-emerald-400"
												>
													{article.title}
												</h3>
												{#if article.excerpt}
													<p class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-400">
														{article.excerpt}
													</p>
												{/if}
												<div class="mt-3 flex items-center gap-2 text-sm text-gray-500">
													{#if article.author?.profilePicture}
														<img
															src={article.author.profilePicture}
															alt=""
															class="h-5 w-5 rounded-full object-cover"
														/>
													{/if}
													{#if article.author}
														<span class="text-gray-400">{article.author.name}</span>
														<span class="text-gray-600">·</span>
													{/if}
													<span>{formatDate(article.publishedAt)}</span>
												</div>
											</article>
										</a>
									</div>
								{/each}
							</div>

							<!-- Premium Pagination -->
							{#if totalPremiumPages > 1}
								<div class="mt-8 flex items-center justify-center gap-2">
									<button
										on:click={() => goToPremiumPage(premiumPage - 1)}
										disabled={premiumPage === 1}
										aria-label="Previous page"
										class="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<svg
											class="h-4 w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M15.75 19.5L8.25 12l7.5-7.5"
											/>
										</svg>
									</button>
									{#each getPageNumbers(premiumPage, totalPremiumPages) as page}
										{#if page === '...'}
											<span class="px-2 text-gray-500">...</span>
										{:else}
											<button
												on:click={() => goToPremiumPage(page)}
												class="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors {page ===
												premiumPage
													? 'border-emerald-500 bg-emerald-500 text-white'
													: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10'}"
											>
												{page}
											</button>
										{/if}
									{/each}
									<button
										on:click={() => goToPremiumPage(premiumPage + 1)}
										disabled={premiumPage === totalPremiumPages}
										aria-label="Next page"
										class="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<svg
											class="h-4 w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M8.25 4.5l7.5 7.5-7.5 7.5"
											/>
										</svg>
									</button>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Free Articles Section -->
					{#if freeArticles.length > 0}
						<div id="free-articles" class="scroll-mt-20">
							<!-- Section Header -->
							<div class="mb-6 flex items-center gap-3">
								<div class="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1.5">
									<svg
										class="h-4 w-4 text-blue-400"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
										/>
									</svg>
									<span class="text-sm font-bold text-blue-400">Free to Read</span>
								</div>
								<div class="h-px flex-1 bg-gradient-to-r from-blue-500/30 to-transparent"></div>
								<span class="text-sm text-gray-500"
									>{freeArticles.length} article{freeArticles.length !== 1 ? 's' : ''}</span
								>
							</div>

							<!-- Free Grid -->
							<div class="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
								{#each paginatedFreeArticles as article, i (article.slug + '-' + freePage)}
									<div class="article-card-animate" style="animation-delay: {i * 50}ms">
										<a href="/articles/{article.slug}" class="group block">
											<article>
												<!-- Image -->
												<div
													class="relative mb-4 aspect-video overflow-hidden rounded-lg bg-gray-800"
												>
													{#if article.coverImage?.src}
														<img
															src={article.coverImage.src}
															srcset={article.coverImage.srcset}
															sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
															alt=""
															class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
															loading="lazy"
														/>
													{/if}
													<!-- Free Now Badge -->
													{#if article.isFreeNow}
														<div class="absolute top-2 left-2">
															<span
																class="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
																>FREE NOW</span
															>
														</div>
													{/if}
												</div>
												<!-- Content -->
												{#if article.tags?.[0]}
													<span class="text-xs font-bold tracking-wide text-blue-400 uppercase">
														{article.tags[0].name}
													</span>
												{/if}
												<h3
													class="mt-1 font-display text-lg leading-snug font-bold text-white transition-colors group-hover:text-blue-400"
												>
													{article.title}
												</h3>
												{#if article.excerpt}
													<p class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-400">
														{article.excerpt}
													</p>
												{/if}
												<div class="mt-3 flex items-center gap-2 text-sm text-gray-500">
													{#if article.author?.profilePicture}
														<img
															src={article.author.profilePicture}
															alt=""
															class="h-5 w-5 rounded-full object-cover"
														/>
													{/if}
													{#if article.author}
														<span class="text-gray-400">{article.author.name}</span>
														<span class="text-gray-600">·</span>
													{/if}
													<span>{formatDate(article.publishedAt)}</span>
												</div>
											</article>
										</a>
									</div>
								{/each}
							</div>

							<!-- Free Pagination -->
							{#if totalFreePages > 1}
								<div class="mt-8 flex items-center justify-center gap-2">
									<button
										on:click={() => goToFreePage(freePage - 1)}
										disabled={freePage === 1}
										aria-label="Previous page"
										class="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 transition-colors hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<svg
											class="h-4 w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M15.75 19.5L8.25 12l7.5-7.5"
											/>
										</svg>
									</button>
									{#each getPageNumbers(freePage, totalFreePages) as page}
										{#if page === '...'}
											<span class="px-2 text-gray-500">...</span>
										{:else}
											<button
												on:click={() => goToFreePage(page)}
												class="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors {page ===
												freePage
													? 'border-blue-500 bg-blue-500 text-white'
													: 'border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10'}"
											>
												{page}
											</button>
										{/if}
									{/each}
									<button
										on:click={() => goToFreePage(freePage + 1)}
										disabled={freePage === totalFreePages}
										aria-label="Next page"
										class="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 transition-colors hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<svg
											class="h-4 w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M8.25 4.5l7.5 7.5-7.5 7.5"
											/>
										</svg>
									</button>
								</div>
							{/if}
						</div>
					{/if}
				{/if}
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

<style>
	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.article-card-animate {
		animation: slideUp 0.3s ease-out forwards;
		opacity: 0;
	}
</style>
