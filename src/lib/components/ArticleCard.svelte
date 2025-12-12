<script>
	/**
	 * ArticleCard - Reusable article card component
	 * Vertical layout with image and overlaid content
	 */
	export let article;

	// Format date
	function formatDate(dateStr) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	$: primaryTag = article.tags?.[0]?.name || null;
</script>

<a href="/articles/{article.slug}" class="group block">
	<div class="relative h-[200px] sm:h-[260px] overflow-hidden rounded-xl sm:rounded-2xl border border-gray-800 bg-gray-900 transition-all hover:border-gray-700">
		<!-- Background Image -->
		{#if article.coverImage?.src}
			<img
				src={article.coverImage.src}
				srcset={article.coverImage.srcset}
				sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
				alt=""
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
				loading="lazy"
			/>
		{:else}
			<div class="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"></div>
		{/if}

		<!-- Gradient Overlay -->
		<div class="absolute inset-0 bg-gradient-to-t from-gray-900 from-20% via-gray-900/60 via-50% to-transparent"></div>

		<!-- Tag Badge (Top Left) -->
		{#if primaryTag}
			<div class="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
				<span class="rounded-md bg-gray-900/70 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium text-white backdrop-blur-sm">
					#{primaryTag.toLowerCase()}
				</span>
			</div>
		{/if}

		<!-- Content Overlay (Bottom) -->
		<div class="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-5">
			<div class="flex items-end justify-between gap-3">
				<!-- Text Content -->
				<div class="min-w-0 flex-1">
					<!-- Premium Badge (above title) -->
					{#if article.isPremium}
						<span class="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-white mb-2">
							<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 24 24">
								<path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clip-rule="evenodd" />
							</svg>
							Premium
						</span>
					{/if}

					<!-- Title -->
					<h3 class="text-base sm:text-xl font-bold leading-tight text-white drop-shadow-lg line-clamp-2">
						{article.title}
					</h3>

					<!-- Excerpt (hidden on mobile) -->
					{#if article.excerpt}
						<p class="mt-2 text-sm text-gray-300 line-clamp-2 drop-shadow-md hidden sm:block">
							{article.excerpt}
						</p>
					{/if}

					<!-- Author & Date -->
					{#if article.author || article.publishedAt}
						<div class="mt-2 sm:mt-3 flex items-center gap-2 text-[10px] sm:text-xs text-gray-400">
							{#if article.author}
								{#if article.author.profilePicture}
									<img
										src={article.author.profilePicture}
										alt={article.author.name}
										class="h-5 w-5 sm:h-6 sm:w-6 rounded-full object-cover ring-2 ring-white/20"
									/>
								{/if}
								<span class="font-medium text-gray-300 truncate max-w-[100px] sm:max-w-none">{article.author.name}</span>
								<span class="text-gray-500">·</span>
							{/if}
							<span class="shrink-0">{formatDate(article.publishedAt)}</span>
						</div>
					{/if}
				</div>

				<!-- Arrow Icon (Bottom Right) -->
				<div class="shrink-0 text-gray-400 transition-all duration-300 group-hover:text-white group-hover:translate-x-1">
					<svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
					</svg>
				</div>
			</div>
		</div>
	</div>
</a>
