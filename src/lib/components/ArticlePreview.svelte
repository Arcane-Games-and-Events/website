<script>
	/**
	 * ArticlePreview - Flexible article preview component
	 * Supports three variants:
	 * - 'hero': Large featured with overlay text on image (The Ringer style)
	 * - 'card': Standard card with 16:9 image above text
	 * - 'compact': Horizontal layout with 16:9 thumbnail and text
	 */
	export let article;
	export let variant = 'card'; // 'hero' | 'card' | 'compact'

	// Format date
	function formatDate(dateStr, includeYear = true) {
		if (!dateStr) return '';
		const options = includeYear
			? { month: 'short', day: 'numeric', year: 'numeric' }
			: { month: 'short', day: 'numeric' };
		return new Date(dateStr).toLocaleDateString('en-US', options);
	}
</script>

{#if variant === 'hero'}
	<!-- Hero Article (Large with overlay - The Ringer style) -->
	<a href="/articles/{article.slug}" class="group block">
		<article class="relative overflow-hidden rounded-xl bg-gray-900">
			<!-- 16:9 Image Container -->
			<div class="relative aspect-video overflow-hidden">
				{#if article.coverImage?.src}
					<div class="absolute inset-0 animate-pulse bg-gray-800"></div>
					<img
						src={article.coverImage.src}
						srcset={article.coverImage.srcset}
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 50vw"
						alt=""
						class="relative h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
						loading="lazy"
						decoding="async"
						on:load={(e) => (e.target.style.opacity = '1')}
						style="opacity: 0;"
					/>
				{:else}
					<div class="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
				{/if}
				<!-- Gradient Overlay -->
				<div
					class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"
				></div>
			</div>

			<!-- Text Overlay -->
			<div class="absolute inset-x-0 bottom-0 p-4 sm:p-6">
				<!-- Category & Premium Badge -->
				<div class="mb-2 flex flex-wrap items-center gap-2">
					{#if article.tags?.[0]}
						<span
							class="text-xs font-semibold tracking-wider text-blue-400 uppercase"
						>
							{article.tags[0].name}
						</span>
					{/if}
					{#if article.isPremium}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase backdrop-blur-sm"
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
					{:else if article.isFreeNow}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase backdrop-blur-sm"
						>
							<svg class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
								<path
									fill-rule="evenodd"
									d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
									clip-rule="evenodd"
								/>
							</svg>
							Free Now
						</span>
					{/if}
				</div>

				<!-- Title -->
				<h3
					class="font-display text-xl leading-tight font-bold text-white transition-colors group-hover:text-blue-400 sm:text-2xl lg:text-3xl"
				>
					{article.title}
				</h3>

				<!-- Excerpt -->
				{#if article.excerpt}
					<p class="mt-2 line-clamp-2 text-sm text-gray-300 sm:text-base">
						{article.excerpt}
					</p>
				{/if}

				<!-- Author & Date -->
				<div class="mt-3 flex items-center gap-2 text-xs text-gray-400 sm:text-sm">
					{#if article.author?.profilePicture}
						<img
							src={article.author.profilePicture}
							alt={article.author.name}
							class="h-6 w-6 rounded-full object-cover ring-2 ring-white/20"
							loading="lazy"
							decoding="async"
						/>
					{/if}
					{#if article.author}
						<span class="font-medium text-gray-300">{article.author.name}</span>
						<span class="text-gray-600">·</span>
					{/if}
					<span>{formatDate(article.publishedAt)}</span>
				</div>
			</div>
		</article>
	</a>
{:else if variant === 'card'}
	<!-- Card Article (16:9 image above text) -->
	<a href="/articles/{article.slug}" class="group block">
		<article class="h-full">
			{#if article.coverImage?.src}
				<div class="relative mb-3 aspect-video overflow-hidden rounded-lg bg-gray-800">
					<div class="absolute inset-0 animate-pulse bg-gray-800"></div>
					<img
						src={article.coverImage.src}
						srcset={article.coverImage.srcset}
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
				class="mt-1 font-display text-base leading-tight font-bold text-white transition-colors group-hover:text-blue-400 sm:text-lg"
			>
				{article.title}
			</h3>
			{#if article.excerpt}
				<p class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-400">
					{article.excerpt}
				</p>
			{/if}
			<div class="mt-2 flex items-center gap-2 text-xs text-gray-500">
				{#if article.author?.profilePicture}
					<img
						src={article.author.profilePicture}
						alt={article.author.name}
						class="h-5 w-5 rounded-full object-cover"
						loading="lazy"
						decoding="async"
					/>
				{/if}
				{#if article.author}
					<span class="font-medium text-gray-400">{article.author.name}</span>
					<span>·</span>
				{/if}
				<span>{formatDate(article.publishedAt, false)}</span>
				{#if article.isPremium}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase"
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
				{:else if article.isFreeNow}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase"
					>
						<svg class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
							<path
								fill-rule="evenodd"
								d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
								clip-rule="evenodd"
							/>
						</svg>
						Free Now
					</span>
				{:else}
					<span
						class="rounded-full bg-gray-700/50 px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase"
					>
						Free
					</span>
				{/if}
			</div>
		</article>
	</a>
{:else}
	<!-- Compact Article (Horizontal with 16:9 thumbnail) -->
	<a href="/articles/{article.slug}" class="group block">
		<article class="flex gap-4">
			{#if article.coverImage?.src}
				<div
					class="relative w-28 shrink-0 overflow-hidden rounded-lg bg-gray-800 sm:w-36"
				>
					<div class="aspect-video">
						<div class="absolute inset-0 animate-pulse bg-gray-800"></div>
						<img
							src={article.coverImage.src}
							srcset={article.coverImage.srcset}
							sizes="144px"
							alt=""
							class="absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
							loading="lazy"
							decoding="async"
							on:load={(e) => (e.target.style.opacity = '1')}
							style="opacity: 0;"
						/>
					</div>
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
							class="h-5 w-5 rounded-full object-cover"
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
						<span
							class="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 uppercase"
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
					{:else if article.isFreeNow}
						<span
							class="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 uppercase"
						>
							<svg class="h-2 w-2" fill="currentColor" viewBox="0 0 24 24">
								<path
									fill-rule="evenodd"
									d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
									clip-rule="evenodd"
								/>
							</svg>
							Free Now
						</span>
					{:else}
						<span
							class="rounded-full bg-gray-700/50 px-1.5 py-0.5 text-[9px] font-semibold text-gray-400 uppercase"
						>
							Free
						</span>
					{/if}
				</div>
			</div>
		</article>
	</a>
{/if}
