<script>
	import FadeImage from '$lib/components/FadeImage.svelte';
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

	// Featured article (most recent)
	$: featuredArticle = allArticles.length > 0 ? allArticles[0] : null;

	// Secondary featured articles (2nd and 3rd newest)
	$: secondaryFeatured = allArticles.slice(1, 3);

	// Filtered articles
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
	<!-- Hero Section - Featured Article -->
	{#if featuredArticle}
		<section class="relative flex min-h-[420px] items-center sm:min-h-[480px] lg:min-h-[540px]">
			<!-- Background Image -->
			<div class="absolute inset-0">
				{#if featuredArticle.coverImage}
					<FadeImage
						src={featuredArticle.coverImage}
						alt=""
						class="h-full w-full object-cover"
						loading="eager"
					/>
				{:else}
					<div class="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
				{/if}
				<!-- Gradient overlay: dark on left for readability, transparent on right to show original image -->
				<div class="absolute inset-0 bg-gradient-to-r from-gray-950/85 from-30% via-gray-950/60 via-50% to-transparent to-70%"></div>
				<!-- Bottom gradient for smooth transition -->
				<div class="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
			</div>

			<!-- Content -->
			<div class="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div class="max-w-xl lg:max-w-2xl">
					<!-- Category/Tag -->
					<div class="mb-4 flex items-center gap-3">
						{#if featuredArticle.tags && featuredArticle.tags.length > 0}
							<a
								href="/read/tag/{featuredArticle.tags[0].slug}"
								class="text-sm font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors"
							>
								{featuredArticle.tags[0].name}
							</a>
						{/if}
						{#if featuredArticle.isPremium}
							<span class="flex items-center gap-1 text-sm font-semibold text-emerald-400">
								<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
								</svg>
								Premium
							</span>
						{/if}
					</div>

					<!-- Title -->
					<a href="/read/{featuredArticle.slug}" class="group block">
						<h1 class="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl group-hover:text-gray-200 transition-colors drop-shadow-lg">
							{featuredArticle.title}
						</h1>
					</a>

					<!-- Excerpt -->
					{#if featuredArticle.excerpt}
						<p class="mt-4 text-base text-gray-300 leading-relaxed line-clamp-2 drop-shadow-md">
							{featuredArticle.excerpt}
						</p>
					{/if}

					<!-- Meta -->
					<div class="mt-5 flex items-center gap-4">
						{#if featuredArticle.author}
							<a href="/read/author/{featuredArticle.author.slug}" class="flex items-center gap-2 group">
								{#if featuredArticle.author.profilePicture}
									<img
										src={featuredArticle.author.profilePicture}
										alt={featuredArticle.author.name}
										class="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
									/>
								{:else}
									<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white/20">
										<span class="text-sm font-bold text-white">
											{featuredArticle.author.name.charAt(0)}
										</span>
									</div>
								{/if}
								<div>
									<span class="block text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
										{featuredArticle.author.name}
									</span>
									<span class="text-sm text-gray-400">
										{formatDate(featuredArticle.publishedAt)} · {getReadTime(featuredArticle)}
									</span>
								</div>
							</a>
						{/if}
					</div>

					<!-- Read Now Button -->
					<a
						href="/read/{featuredArticle.slug}"
						class="group/btn mt-6 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 hover:from-blue-400 hover:to-purple-500"
					>
						Read Now
						<svg class="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
						</svg>
					</a>
				</div>
			</div>
		</section>
	{/if}

	<!-- Secondary Featured Section -->
	{#if secondaryFeatured.length > 0}
		<section class="border-y border-white/10 bg-gray-900/50">
			<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div class="grid gap-6 sm:grid-cols-2">
					{#each secondaryFeatured as article}
						<article class="group flex gap-5">
							<!-- Thumbnail -->
							<a href="/read/{article.slug}" class="shrink-0">
								<div class="relative h-28 w-40 overflow-hidden rounded-xl bg-gray-800 sm:h-32 sm:w-48">
									{#if article.coverImage}
										<FadeImage
											src={article.coverImage}
											alt={article.title}
											class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
										/>
									{:else}
										<div class="flex h-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
											<svg class="h-10 w-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
											</svg>
										</div>
									{/if}
									{#if article.isPremium}
										<div class="absolute top-2 left-2">
											<span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
												<svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
													<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
												</svg>
											</span>
										</div>
									{/if}
								</div>
							</a>

							<!-- Content -->
							<div class="flex flex-col justify-center">
								{#if article.tags && article.tags.length > 0}
									<a href="/read/tag/{article.tags[0].slug}" class="mb-1 text-xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors">
										{article.tags[0].name}
									</a>
								{/if}
								<a href="/read/{article.slug}">
									<h3 class="text-lg font-bold text-white leading-snug group-hover:text-gray-300 transition-colors line-clamp-2">
										{article.title}
									</h3>
								</a>
								<div class="mt-2 flex items-center gap-2 text-sm text-gray-400">
									{#if article.author}
										<a href="/read/author/{article.author.slug}" class="font-medium text-gray-300 hover:text-white transition-colors">{article.author.name}</a>
										<span>·</span>
									{/if}
									<span>{getReadTime(article)}</span>
								</div>
							</div>
						</article>
					{/each}
				</div>
			</div>
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
