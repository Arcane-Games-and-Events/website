<script>
	import FadeImage from '$lib/components/FadeImage.svelte';
	export let data;

	// Filter state
	let selectedAccessType = 'all'; // 'all', 'free', 'premium'
	let selectedAuthor = null;

	// Get unique authors from tag's articles
	$: allAuthors = [...new Map(
		data.articles
			.filter(article => article.author)
			.map(article => [article.author.slug, article.author])
	).values()].sort((a, b) => a.name.localeCompare(b.name));

	// Filtered articles
	$: filteredArticles = data.articles.filter(article => {
		// Filter by access type
		if (selectedAccessType === 'free' && article.isPremium) return false;
		if (selectedAccessType === 'premium' && !article.isPremium) return false;

		// Filter by author
		if (selectedAuthor) {
			if (!article.author || article.author.slug !== selectedAuthor) return false;
		}

		return true;
	});

	// Clear filters
	function clearFilters() {
		selectedAccessType = 'all';
		selectedAuthor = null;
	}

	// Get reading time from CMS or estimate as fallback
	function getReadTime(article) {
		if (article.readTime) {
			return `${article.readTime} min read`;
		}
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

	// Stats
	$: articleCount = data.articles.length;
	$: premiumCount = data.articles.filter(a => a.isPremium).length;
	$: freeCount = articleCount - premiumCount;
	$: authorCount = allAuthors.length;
</script>

<svelte:head>
	<title>{data.tag.name} - Articles - AGE</title>
	<meta name="description" content="Articles tagged with {data.tag.name} on AGE" />
</svelte:head>

<div class="min-h-screen">
	<!-- Header Bar -->
	<div class="border-b border-white/10 bg-gray-900/50">
		<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
			<a href="/read" class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
				</svg>
				Back to all articles
			</a>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
		<div class="lg:grid lg:grid-cols-3 lg:gap-12">
			<!-- Left Column - Tag Info (1/3) -->
			<aside class="lg:col-span-1">
				<div class="sticky top-8">
					<!-- Tag Card -->
					<div class="rounded-2xl border border-white/10 bg-gray-900/50 p-6 lg:p-8">
						<!-- Tag Icon -->
						<div class="mb-6 flex justify-center">
							<div class="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 ring-4 ring-white/10 lg:h-32 lg:w-32">
								<svg class="h-12 w-12 text-white lg:h-16 lg:w-16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
								</svg>
							</div>
						</div>

						<!-- Tag Name -->
						<h1 class="text-center text-2xl font-bold text-white lg:text-3xl">
							{data.tag.name}
						</h1>

						<!-- Description -->
						{#if data.tag.description}
							<p class="mt-3 text-center text-sm text-gray-400">
								{data.tag.description}
							</p>
						{/if}

						<!-- Stats -->
						<div class="mt-6 border-t border-white/10 pt-6">
							<div class="flex justify-center gap-6 text-center">
								<div>
									<div class="text-2xl font-bold text-white">{articleCount}</div>
									<div class="text-xs text-gray-400">Articles</div>
								</div>
								{#if premiumCount > 0}
									<div>
										<div class="text-2xl font-bold text-emerald-400">{premiumCount}</div>
										<div class="text-xs text-gray-400">Premium</div>
									</div>
								{/if}
								{#if freeCount > 0}
									<div>
										<div class="text-2xl font-bold text-blue-400">{freeCount}</div>
										<div class="text-xs text-gray-400">Free</div>
									</div>
								{/if}
							</div>
						</div>

						<!-- Contributors -->
						{#if authorCount > 0}
							<div class="mt-6 border-t border-white/10 pt-6">
								<h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Contributors</h3>
								<div class="text-center">
									<div class="text-lg font-bold text-white">{authorCount}</div>
									<div class="text-xs text-gray-400">{authorCount === 1 ? 'Author' : 'Authors'}</div>
								</div>
								<!-- Author Avatars -->
								<div class="mt-4 flex flex-wrap justify-center gap-2">
									{#each allAuthors.slice(0, 6) as author}
										<a
											href="/read/author/{author.slug}"
											class="group relative"
											title={author.name}
										>
											{#if author.profilePicture}
												<FadeImage
													src={author.profilePicture}
													alt={author.name}
													class="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 transition-all group-hover:ring-blue-400"
												/>
											{:else}
												<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-600 to-gray-700 ring-2 ring-white/10 transition-all group-hover:ring-blue-400">
													<span class="text-sm font-medium text-white">
														{author.name.charAt(0).toUpperCase()}
													</span>
												</div>
											{/if}
										</a>
									{/each}
									{#if allAuthors.length > 6}
										<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 ring-2 ring-white/10">
											<span class="text-xs font-medium text-gray-400">+{allAuthors.length - 6}</span>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</aside>

			<!-- Right Column - Articles (2/3) -->
			<main class="mt-8 lg:col-span-2 lg:mt-0">
				<!-- Section Header with Filters -->
				<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-xl font-bold text-white">Articles</h2>
						<p class="text-sm text-gray-400">
							{filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
							{#if selectedAccessType !== 'all' || selectedAuthor}
								<span class="text-gray-500">(filtered)</span>
							{/if}
						</p>
					</div>

					<!-- Filters -->
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

						<!-- Author Dropdown -->
						{#if allAuthors.length > 0}
							<select
								bind:value={selectedAuthor}
								class="rounded-lg border border-white/10 bg-gray-800/50 px-3 py-2 text-xs font-medium text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							>
								<option value={null}>All Authors</option>
								{#each allAuthors as author}
									<option value={author.slug}>{author.name}</option>
								{/each}
							</select>
						{/if}

						<!-- Clear Filters -->
						{#if selectedAccessType !== 'all' || selectedAuthor}
							<button
								on:click={clearFilters}
								class="text-xs font-medium text-gray-400 hover:text-white transition-colors"
							>
								Clear
							</button>
						{/if}
					</div>
				</div>

				<!-- Articles List -->
				{#if filteredArticles.length > 0}
					<div class="space-y-6">
						{#each filteredArticles as article}
							<article class="group flex gap-5 rounded-xl p-3 -m-3 transition-colors hover:bg-white/5">
								<!-- Thumbnail -->
								<a href="/read/{article.slug}" class="shrink-0">
									<div class="relative h-24 w-36 overflow-hidden rounded-lg bg-gray-800 sm:h-28 sm:w-44">
										{#if article.coverImage}
											<FadeImage
												src={article.coverImage}
												alt={article.title}
												class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
										{:else}
											<div class="flex h-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
												<svg class="h-8 w-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
												</svg>
											</div>
										{/if}
										{#if article.isPremium}
											<div class="absolute top-2 left-2">
												<span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
													<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
														<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
													</svg>
												</span>
											</div>
										{/if}
									</div>
								</a>

								<!-- Content -->
								<div class="flex flex-1 flex-col justify-center min-w-0">
									<!-- Author -->
									{#if article.author}
										<a href="/read/author/{article.author.slug}" class="mb-1 flex items-center gap-2 w-fit group/author">
											{#if article.author.profilePicture}
												<img
													src={article.author.profilePicture}
													alt={article.author.name}
													class="h-5 w-5 rounded-full object-cover"
												/>
											{/if}
											<span class="text-xs font-medium text-gray-400 group-hover/author:text-white transition-colors">
												{article.author.name}
											</span>
										</a>
									{/if}

									<!-- Title -->
									<a href="/read/{article.slug}">
										<h3 class="text-lg font-bold text-white leading-snug group-hover:text-gray-300 transition-colors line-clamp-2">
											{article.title}
										</h3>
									</a>

									<!-- Excerpt (hidden on mobile) -->
									{#if article.excerpt}
										<p class="mt-1 hidden text-sm text-gray-400 line-clamp-1 sm:block">
											{article.excerpt}
										</p>
									{/if}

									<!-- Meta -->
									<div class="mt-2 flex items-center gap-2 text-xs text-gray-500">
										<span>{formatDate(article.publishedAt)}</span>
										<span>·</span>
										<span>{getReadTime(article)}</span>
										<span>·</span>
										<span class="{article.isPremium ? 'text-emerald-400' : 'text-blue-400'} font-medium">
											{article.isPremium ? 'Premium' : 'Free'}
										</span>
									</div>
								</div>

								<!-- Arrow (hidden on mobile) -->
								<a href="/read/{article.slug}" class="hidden items-center sm:flex">
									<svg class="h-5 w-5 text-gray-600 transition-colors group-hover:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
									</svg>
								</a>
							</article>
						{/each}
					</div>
				{:else if data.articles.length === 0}
					<div class="rounded-xl border border-white/10 bg-white/5 py-16 text-center">
						<svg class="mx-auto h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
						</svg>
						<h3 class="mt-4 text-lg font-semibold text-white">No articles yet</h3>
						<p class="mt-2 text-sm text-gray-400">
							No articles have been tagged with "{data.tag.name}" yet.
						</p>
					</div>
				{:else}
					<div class="rounded-xl border border-white/10 bg-white/5 py-12 text-center">
						<p class="text-gray-400">No articles match your filters.</p>
						<button on:click={clearFilters} class="mt-2 text-blue-400 hover:text-blue-300 transition-colors">
							Clear filters
						</button>
					</div>
				{/if}
			</main>
		</div>
	</div>
</div>
