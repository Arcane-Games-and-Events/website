<script>
	export let data;
</script>

<svelte:head>
	<title>Learn - Arcane Games and Events</title>
</svelte:head>

<!-- Page Header -->
<section
	class="relative overflow-hidden bg-gradient-to-b from-gray-800 to-gray-950 py-12 sm:py-16"
>
	<div class="container mx-auto max-w-7xl px-4">
		<div class="text-center">
			<h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Learn</h1>
			<p class="mx-auto max-w-2xl text-lg text-gray-400">
				Strategy guides, game analysis, and exclusive content from our expert writers
			</p>
		</div>
	</div>
</section>

<!-- Articles Grid -->
<section class="py-12">
	<div class="container mx-auto max-w-7xl px-4">
		{#if data.articles.length === 0}
			<div class="py-12 text-center">
				<p class="text-lg text-gray-400">No articles available yet.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each data.articles as article}
					<article
						class="overflow-hidden rounded-[var(--radius)] border bg-gray-950 shadow-md transition-shadow hover:shadow-lg"
					>
						<a href="/read/{article.slug}" class="block">
							<!-- Cover Image -->
							{#if article.coverImage}
								<div class="h-48 w-full overflow-hidden bg-gray-800">
									<img
										src={article.coverImage}
										alt={article.title}
										class="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
									/>
								</div>
							{:else}
								<!-- Image Placeholder -->
								<div
									class="flex h-48 w-full items-center justify-center bg-gray-800 text-gray-400"
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

							<!-- Content -->
							<div class="p-6">
								<!-- Premium Badge -->
								{#if article.isPremium}
									<div class="mb-2 flex gap-2">
										<span
											class="rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-white"
										>
											Premium
										</span>
									</div>
								{/if}

								<!-- Title -->
								<h2
									class="mb-2 line-clamp-2 text-xl font-semibold text-gray-100 transition-colors group-hover:text-white"
								>
									{article.title}
								</h2>

								<!-- Excerpt -->
								{#if article.excerpt}
									<p class="mb-4 line-clamp-3 text-gray-400">
										{article.excerpt}
									</p>
								{/if}

								<!-- Date -->
								{#if article.publishedAt}
									<div class="flex items-center justify-between">
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
										<span class="text-sm font-medium text-white hover:underline">
											Read More →
										</span>
									</div>
								{/if}
							</div>
						</a>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</section>
