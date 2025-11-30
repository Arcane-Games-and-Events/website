<script>
	import FadeImage from '$lib/components/FadeImage.svelte';
	export let data;

	// Filter state
	let selectedAccessType = 'all'; // 'all', 'free', 'premium'
	let selectedTag = null;

	// Get unique tags from author's articles
	$: allTags = [...new Set(data.articles.flatMap(article => article.tags || []).map(tag => tag.name))].sort();

	// Filtered articles
	$: filteredArticles = data.articles.filter(article => {
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

	// Clear filters
	function clearFilters() {
		selectedAccessType = 'all';
		selectedTag = null;
	}

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

	// Social media icons and URLs
	const socialMediaConfig = [
		{
			key: 'twitter',
			label: 'Twitter',
			icon: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
			color: 'text-sky-400 hover:text-sky-300'
		},
		{
			key: 'youtube',
			label: 'YouTube',
			icon: 'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z M9.75 15.02l0-6.89 5.75 3.44z',
			color: 'text-red-400 hover:text-red-300'
		},
		{
			key: 'patreon',
			label: 'Patreon',
			icon: 'M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003',
			color: 'text-orange-400 hover:text-orange-300'
		},
		{
			key: 'twitch',
			label: 'Twitch',
			icon: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6.857 0L1.714 5.143v14.286h4.286v4.285L11.143 19.714h3.428l6.858-6.857V0H6.857zm13.714 11.571l-3.428 3.429h-3.429l-3 3v-3H6.857V1.714h13.714V11.57z',
			color: 'text-purple-400 hover:text-purple-300'
		},
		{
			key: 'discord',
			label: 'Discord',
			icon: 'M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z',
			color: 'text-indigo-400 hover:text-indigo-300'
		},
		{
			key: 'website',
			label: 'Website',
			icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
			color: 'text-gray-400 hover:text-gray-300'
		}
	];

	// Get active social media links
	$: activeSocialMedia = data.author.socialMedia
		? socialMediaConfig.filter(social => data.author.socialMedia[social.key])
		: [];

	// Stats
	$: articleCount = data.articles.length;
	$: premiumCount = data.articles.filter(a => a.isPremium).length;
	$: freeCount = articleCount - premiumCount;
</script>

<svelte:head>
	<title>{data.author.name} - Author - AGE</title>
	<meta name="description" content="Articles by {data.author.name} on AGE" />
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
			<!-- Left Column - Author Info (1/3) -->
			<aside class="lg:col-span-1">
				<div class="sticky top-8">
					<!-- Author Card -->
					<div class="rounded-2xl border border-white/10 bg-gray-900/50 p-6 lg:p-8">
						<!-- Profile Picture -->
						<div class="mb-6 flex justify-center">
							{#if data.author.profilePicture}
								<FadeImage
									src={data.author.profilePicture}
									alt={data.author.name}
									class="h-32 w-32 rounded-2xl object-cover ring-4 ring-white/10 lg:h-40 lg:w-40"
									loading="eager"
								/>
							{:else}
								<div class="flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 ring-4 ring-white/10 lg:h-40 lg:w-40">
									<span class="text-5xl font-bold text-white lg:text-6xl">
										{data.author.name.charAt(0).toUpperCase()}
									</span>
								</div>
							{/if}
						</div>

						<!-- Name -->
						<h1 class="text-center text-2xl font-bold text-white lg:text-3xl">
							{data.author.name}
						</h1>

						<!-- Stats -->
						<div class="mt-4 flex justify-center gap-6 text-center">
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

						<!-- Bio -->
						{#if data.author.bio}
							<div class="mt-6 border-t border-white/10 pt-6">
								<div class="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
									{@html data.author.bio}
								</div>
							</div>
						{/if}

						<!-- Social Media Links -->
						{#if activeSocialMedia.length > 0}
							<div class="mt-6 border-t border-white/10 pt-6">
								<h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Connect</h3>
								<div class="flex flex-wrap gap-2">
									{#each activeSocialMedia as social}
										<a
											href={data.author.socialMedia[social.key]}
											target="_blank"
											rel="noopener noreferrer"
											class="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-white/20 {social.color}"
											title={social.label}
											aria-label={social.label}
										>
											<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
												<path d={social.icon} />
											</svg>
										</a>
									{/each}
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
							{#if selectedAccessType !== 'all' || selectedTag}
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
						{#if selectedAccessType !== 'all' || selectedTag}
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
									<!-- Tag -->
									{#if article.tags && article.tags.length > 0}
										<a href="/read/tag/{article.tags[0].slug}" class="mb-1 text-xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors w-fit">
											{article.tags[0].name}
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
								<a href="/read/{article.slug}" class="hidden items-center sm:flex" aria-label="Read {article.title}">
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
							{data.author.name} hasn't published any articles yet.
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
