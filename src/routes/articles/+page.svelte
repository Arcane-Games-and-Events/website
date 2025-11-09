<script>
	export let data;
</script>

<svelte:head>
	<title>Articles - Arcane Games and Events</title>
</svelte:head>

<!-- Page Header -->
<section class="relative overflow-hidden bg-gradient-to-b from-[hsl(var(--muted))] to-[hsl(var(--background))] py-12 sm:py-16">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="text-center">
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
				Articles
			</h1>
			<p class="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
				Strategy guides, game analysis, and exclusive content from our expert writers
			</p>
		</div>
	</div>
</section>

<!-- Articles Grid -->
<section class="py-12">
	<div class="container mx-auto max-w-7xl px-4">
		{#if data.articles.length === 0}
			<div class="text-center py-12">
				<p class="text-lg text-[hsl(var(--muted-foreground))]">No articles available yet.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.articles as article}
					<article class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md overflow-hidden hover:shadow-lg transition-shadow">
						<a href="/articles/{article.slug}" class="block">
							<!-- Image Placeholder -->
							<div class="w-full h-48 bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
								<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
								</svg>
							</div>

							<!-- Content -->
							<div class="p-6">
								<!-- Premium Badge -->
								{#if article.isPremium}
									<div class="flex gap-2 mb-2">
										<span class="px-2 py-1 text-xs rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-medium">
											Premium
										</span>
									</div>
								{/if}

								<!-- Title -->
								<h2 class="text-xl font-semibold mb-2 text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-2">
									{article.title}
								</h2>

								<!-- Excerpt -->
								{#if article.excerpt}
									<p class="text-[hsl(var(--muted-foreground))] mb-4 line-clamp-3">
										{article.excerpt}
									</p>
								{/if}

								<!-- Date -->
								{#if article.publishedAt}
									<div class="flex items-center justify-between">
										<time class="text-sm text-[hsl(var(--muted-foreground))]" datetime={article.publishedAt}>
											{new Date(article.publishedAt).toLocaleDateString('en-US', {
												year: 'numeric',
												month: 'short',
												day: 'numeric'
											})}
										</time>
										<span class="text-[hsl(var(--primary))] hover:underline font-medium text-sm">
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
