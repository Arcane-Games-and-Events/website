<script>
	export let data;

	// Get unique tags from all articles
	$: allTags = [...new Set(data.articles.flatMap(article => article.tags || []).map(tag => tag.name))].sort();

	// Filter state
	let selectedAccessType = 'all'; // 'all', 'free', 'premium'
	let selectedTags = [];

	// Featured article (most recent)
	$: featuredArticle = data.articles.length > 0 ? data.articles[0] : null;

	// Remaining articles (excluding featured)
	$: remainingArticles = data.articles.slice(1);

	// Filtered articles
	$: filteredArticles = remainingArticles.filter(article => {
		// Filter by access type
		if (selectedAccessType === 'free' && article.isPremium) return false;
		if (selectedAccessType === 'premium' && !article.isPremium) return false;

		// Filter by tags
		if (selectedTags.length > 0) {
			const articleTags = (article.tags || []).map(tag => tag.name);
			if (!selectedTags.some(tag => articleTags.includes(tag))) return false;
		}

		return true;
	});

	// Toggle tag selection
	function toggleTag(tag) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter(t => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}

	// Clear all filters
	function clearFilters() {
		selectedAccessType = 'all';
		selectedTags = [];
	}
</script>

<svelte:head>
	<title>Learn - Arcane Games and Events</title>
</svelte:head>

<!-- Featured Article Banner -->
{#if featuredArticle}
	<section class="relative h-[600px] w-full overflow-hidden bg-gray-950">
		<!-- Background Image with Overlay -->
		{#if featuredArticle.coverImage}
			<div class="absolute inset-0">
				<img
					src={featuredArticle.coverImage}
					alt={featuredArticle.title}
					class="h-full w-full object-cover"
				/>
				<div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30"></div>
			</div>
		{:else}
			<div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
		{/if}

		<!-- Content -->
		<div class="relative flex h-full items-end">
			<div class="container mx-auto max-w-7xl px-4 pb-16">
				<div class="max-w-3xl">
					<!-- Featured Badge -->
					<div class="mb-4 flex items-center gap-3">
						<span class="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
							FEATURED
						</span>
						{#if featuredArticle.isPremium}
							<span class="rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-gray-900">
								PREMIUM
							</span>
						{/if}
					</div>

					<!-- Tags -->
					{#if featuredArticle.tags && featuredArticle.tags.length > 0}
						<div class="mb-4 flex flex-wrap gap-2">
							{#each featuredArticle.tags as tag}
								<span
									class="rounded-md bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-medium text-white"
								>
									{tag.name}
								</span>
							{/each}
						</div>
					{/if}

					<!-- Title -->
					<h1 class="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
						{featuredArticle.title}
					</h1>

					<!-- Excerpt -->
					{#if featuredArticle.excerpt}
						<p class="mb-6 text-lg text-gray-200 drop-shadow">
							{featuredArticle.excerpt}
						</p>
					{/if}

					<!-- Author & CTA -->
					<div class="flex items-center gap-6">
						<!-- Author Info -->
						{#if featuredArticle.author}
							<div class="flex items-center gap-3">
								{#if featuredArticle.author.profilePicture}
									<img
										src={featuredArticle.author.profilePicture}
										alt={featuredArticle.author.name}
										class="h-12 w-12 rounded-full object-cover ring-2 ring-white/30"
									/>
								{:else}
									<div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
										<span class="text-base font-semibold text-white">
											{featuredArticle.author.name.charAt(0).toUpperCase()}
										</span>
									</div>
								{/if}
								<div>
									<a
										href="/read/author/{featuredArticle.author.slug}"
										class="text-sm font-semibold text-white drop-shadow hover:text-gray-200 transition-colors"
									>
										{featuredArticle.author.name}
									</a>
									{#if featuredArticle.publishedAt}
										<time class="text-xs text-gray-300 drop-shadow" datetime={featuredArticle.publishedAt}>
											{new Date(featuredArticle.publishedAt).toLocaleDateString('en-US', {
												year: 'numeric',
												month: 'long',
												day: 'numeric'
											})}
										</time>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Read Button -->
						<a
							href="/read/{featuredArticle.slug}"
							class="rounded-[var(--radius)] bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg transition-all hover:bg-gray-100 hover:scale-105"
						>
							Read Article →
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>
{/if}

<!-- Filters Section -->
<section class="border-b border-gray-800 bg-gray-950 py-8">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
			<!-- Access Type Filter -->
			<div class="flex flex-col gap-3">
				<span class="text-sm font-medium text-gray-400">Content Type</span>
				<div class="flex gap-2">
					<button
						on:click={() => selectedAccessType = 'all'}
						class="rounded-[var(--radius)] border px-4 py-2 text-sm font-medium transition-all {selectedAccessType === 'all'
							? 'border-orange-500 bg-orange-500 text-white'
							: 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600 hover:bg-gray-800'}"
					>
						All Articles
					</button>
					<button
						on:click={() => selectedAccessType = 'free'}
						class="rounded-[var(--radius)] border px-4 py-2 text-sm font-medium transition-all {selectedAccessType === 'free'
							? 'border-green-500 bg-green-500 text-white'
							: 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600 hover:bg-gray-800'}"
					>
						Free
					</button>
					<button
						on:click={() => selectedAccessType = 'premium'}
						class="rounded-[var(--radius)] border px-4 py-2 text-sm font-medium transition-all {selectedAccessType === 'premium'
							? 'border-yellow-500 bg-yellow-500 text-gray-900'
							: 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600 hover:bg-gray-800'}"
					>
						Premium
					</button>
				</div>
			</div>

			<!-- Tags Filter -->
			{#if allTags.length > 0}
				<div class="flex flex-col gap-3">
					<span class="text-sm font-medium text-gray-400">Filter by Tags</span>
					<div class="flex flex-wrap gap-2">
						{#each allTags as tag}
							<button
								on:click={() => toggleTag(tag)}
								class="rounded-[var(--radius)] border px-3 py-1.5 text-xs font-medium transition-all {selectedTags.includes(tag)
									? 'border-orange-500 bg-orange-500 text-white'
									: 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600 hover:bg-gray-800'}"
							>
								{tag}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Clear Filters -->
			{#if selectedAccessType !== 'all' || selectedTags.length > 0}
				<button
					on:click={clearFilters}
					class="rounded-[var(--radius)] border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800 lg:self-end"
				>
					Clear Filters
				</button>
			{/if}
		</div>

		<!-- Active Filters Display -->
		{#if selectedAccessType !== 'all' || selectedTags.length > 0}
			<div class="mt-4 flex items-center gap-2 text-sm text-gray-400">
				<span>Active filters:</span>
				{#if selectedAccessType !== 'all'}
					<span class="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
						{selectedAccessType === 'free' ? 'Free Content' : 'Premium Content'}
					</span>
				{/if}
				{#each selectedTags as tag}
					<span class="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
						{tag}
					</span>
				{/each}
			</div>
		{/if}
	</div>
</section>

<!-- Articles Grid -->
<section class="py-12">
	<div class="container mx-auto max-w-7xl px-4">
		<!-- Results Count -->
		<div class="mb-6 text-sm text-gray-400">
			{#if filteredArticles.length === 0 && remainingArticles.length > 0}
				No articles match your filters. <button on:click={clearFilters} class="text-orange-400 hover:underline">Clear filters</button>
			{:else if filteredArticles.length > 0}
				Showing {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
			{/if}
		</div>

		{#if data.articles.length === 0}
			<div class="py-12 text-center">
				<p class="text-lg text-gray-400">No articles available yet.</p>
			</div>
		{:else if filteredArticles.length === 0 && remainingArticles.length === 0}
			<div class="py-12 text-center">
				<p class="text-lg text-gray-400">Only the featured article is available.</p>
			</div>
		{:else if filteredArticles.length > 0}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each filteredArticles as article}
					<article
						class="group overflow-hidden rounded-[var(--radius)] border border-gray-800 bg-gray-950 shadow-md transition-all hover:border-gray-700 hover:shadow-xl"
					>
						<!-- Cover Image (clickable) -->
						<a href="/read/{article.slug}" class="block">
							{#if article.coverImage}
								<div class="h-48 w-full overflow-hidden bg-gray-900">
									<img
										src={article.coverImage}
										alt={article.title}
										loading="lazy"
										decoding="async"
										class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
									/>
								</div>
							{:else}
								<!-- Image Placeholder -->
								<div
									class="flex h-48 w-full items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-gray-600"
								>
									<svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
										/>
									</svg>
								</div>
							{/if}
						</a>

						<!-- Content -->
						<div class="p-6">
							<!-- Premium Badge & Tags -->
							<div class="mb-3 flex flex-wrap items-center gap-2">
								{#if article.isPremium}
									<span
										class="rounded-full bg-yellow-500 px-2.5 py-0.5 text-xs font-bold text-gray-900"
									>
										Premium
									</span>
								{/if}
								{#if article.tags && article.tags.length > 0}
									{#each article.tags.slice(0, 2) as tag}
										<span
											class="rounded-md bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs font-medium text-gray-300"
										>
											{tag.name}
										</span>
									{/each}
									{#if article.tags.length > 2}
										<span class="text-xs text-gray-500">+{article.tags.length - 2}</span>
									{/if}
								{/if}
							</div>

							<!-- Title (clickable) -->
							<a href="/read/{article.slug}" class="block">
								<h2
									class="mb-2 line-clamp-2 text-xl font-semibold text-gray-100 transition-colors group-hover:text-white"
								>
									{article.title}
								</h2>
							</a>

							<!-- Excerpt -->
							{#if article.excerpt}
								<p class="mb-4 line-clamp-3 text-sm text-gray-400">
									{article.excerpt}
								</p>
							{/if}

							<!-- Author & Date -->
							<div class="flex items-center justify-between border-t border-gray-800 pt-4">
								<div class="flex items-center gap-2">
									{#if article.author}
										{#if article.author.profilePicture}
											<img
												src={article.author.profilePicture}
												alt={article.author.name}
												loading="lazy"
												decoding="async"
												class="h-8 w-8 rounded-full object-cover"
											/>
										{:else}
											<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800">
												<span class="text-xs font-semibold text-gray-300">
													{article.author.name.charAt(0).toUpperCase()}
												</span>
											</div>
										{/if}
										<div class="flex flex-col">
											<a
												href="/read/author/{article.author.slug}"
												class="text-sm font-medium text-gray-100 hover:text-white transition-colors"
											>
												{article.author.name}
											</a>
											{#if article.publishedAt}
												<time
													class="text-xs text-gray-500"
													datetime={article.publishedAt}
												>
													{new Date(article.publishedAt).toLocaleDateString('en-US', {
														year: 'numeric',
														month: 'short',
														day: 'numeric'
													})}
												</time>
											{/if}
										</div>
									{:else if article.publishedAt}
										<time
											class="text-sm text-gray-400"
											datetime={article.publishedAt}
										>
											{new Date(article.publishedAt).toLocaleDateString('en-US', {
												year: 'numeric',
												month: 'short',
												day: 'numeric'
											})}
										</time>
									{/if}
								</div>
								<a href="/read/{article.slug}" class="text-sm font-medium text-orange-400 hover:text-orange-300">
									Read →
								</a>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</section>
