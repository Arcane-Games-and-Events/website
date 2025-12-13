<script>
	/**
	 * ArticlePreview - Flexible article preview component
	 * Supports two variants:
	 * - 'featured': Large card with full image, title, excerpt, and author
	 * - 'compact': Horizontal layout with thumbnail and text
	 */
	export let article;
	export let variant = 'featured'; // 'featured' | 'compact'

	// Format date
	function formatDate(dateStr, includeYear = true) {
		if (!dateStr) return '';
		const options = includeYear
			? { month: 'short', day: 'numeric', year: 'numeric' }
			: { month: 'short', day: 'numeric' };
		return new Date(dateStr).toLocaleDateString('en-US', options);
	}
</script>

{#if variant === 'featured'}
	<!-- Featured Article (Large) -->
	<a href="/articles/{article.slug}" class="group block">
		<article class="h-full">
			{#if article.coverImage?.src}
				<div class="relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-gray-800">
					<div class="absolute inset-0 animate-pulse bg-gray-800"></div>
					<img
						src={article.coverImage.src}
						srcset={article.coverImage.srcset}
						sizes="(max-width: 640px) 100vw, 50vw"
						alt=""
						class="relative h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
						loading="lazy"
						decoding="async"
						on:load={(e) => (e.target.style.opacity = '1')}
						style="opacity: 0;"
					/>
				</div>
			{/if}
			{#if article.tags?.[0]}
				<span class="text-[10px] font-semibold tracking-wider text-blue-400 uppercase">
					{article.tags[0].name}
				</span>
			{/if}
			<h3
				class="mt-1 font-display text-xl leading-tight font-bold text-white transition-colors group-hover:text-blue-400 sm:text-2xl"
			>
				{article.title}
			</h3>
			{#if article.excerpt}
				<p class="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-400">
					{article.excerpt}
				</p>
			{/if}
			<div class="mt-3 flex items-center gap-2 text-xs text-gray-500">
				{#if article.author?.profilePicture}
					<img
						src={article.author.profilePicture}
						alt={article.author.name}
						class="h-6 w-6 rounded object-cover"
						loading="lazy"
						decoding="async"
					/>
				{/if}
				{#if article.author}
					<span class="font-medium text-gray-400">{article.author.name}</span>
					<span>·</span>
				{/if}
				<span>{formatDate(article.publishedAt)}</span>
				{#if article.isPremium}
					<span>·</span>
					<span
						class="inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
					>
						<svg class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
							<path
								fill-rule="evenodd"
								d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
								clip-rule="evenodd"
							/>
						</svg>
						Premium
					</span>
				{:else if article.accessMode === 'Premium' || article.accessMode === 'premium'}
					<span>·</span>
					<span
						class="inline-flex items-center gap-1 rounded bg-gradient-to-r from-violet-600 to-fuchsia-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
					>
						Now Free
					</span>
				{:else if article.accessMode === 'Free' || article.accessMode === 'free'}
					<span>·</span>
					<span
						class="inline-flex items-center rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-semibold text-gray-300"
					>
						Free
					</span>
				{/if}
			</div>
		</article>
	</a>
{:else}
	<!-- Compact Article (Horizontal) -->
	<a href="/articles/{article.slug}" class="group block">
		<article class="flex gap-4">
			{#if article.coverImage?.src}
				<div
					class="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-800 sm:h-24 sm:w-28"
				>
					<div class="absolute inset-0 animate-pulse bg-gray-800"></div>
					<img
						src={article.coverImage.src}
						srcset={article.coverImage.srcset}
						sizes="112px"
						alt=""
						class="relative h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
						loading="lazy"
						decoding="async"
						on:load={(e) => (e.target.style.opacity = '1')}
						style="opacity: 0;"
					/>
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				{#if article.tags?.[0]}
					<span class="text-[10px] font-semibold tracking-wider text-blue-400 uppercase">
						{article.tags[0].name}
					</span>
				{/if}
				<h4
					class="mt-0.5 font-display text-sm leading-snug font-bold text-white transition-colors group-hover:text-blue-400 sm:text-base"
				>
					{article.title}
				</h4>
				<div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
					{#if article.author?.profilePicture}
						<img
							src={article.author.profilePicture}
							alt={article.author.name}
							class="h-5 w-5 rounded object-cover"
							loading="lazy"
							decoding="async"
						/>
					{/if}
					{#if article.author}
						<span class="text-gray-400">{article.author.name}</span>
						<span>·</span>
					{/if}
					<span>{formatDate(article.publishedAt, false)}</span>
					{#if article.isPremium}
						<span>·</span>
						<span
							class="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-semibold text-white"
						>
							<svg class="h-2 w-2" fill="currentColor" viewBox="0 0 24 24">
								<path
									fill-rule="evenodd"
									d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
									clip-rule="evenodd"
								/>
							</svg>
							Premium
						</span>
					{:else if article.accessMode === 'Premium' || article.accessMode === 'premium'}
						<span>·</span>
						<span
							class="inline-flex items-center rounded bg-gradient-to-r from-violet-600 to-fuchsia-600 px-1 py-0.5 text-[9px] font-semibold text-white"
						>
							Now Free
						</span>
					{:else if article.accessMode === 'Free' || article.accessMode === 'free'}
						<span>·</span>
						<span
							class="inline-flex items-center rounded bg-gray-700 px-1 py-0.5 text-[9px] font-semibold text-gray-300"
						>
							Free
						</span>
					{/if}
				</div>
			</div>
		</article>
	</a>
{/if}
