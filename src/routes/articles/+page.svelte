<script>
	export let data;
</script>

<svelte:head>
	<title>Articles</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<h1 class="text-4xl font-bold mb-8">Articles</h1>

	{#if data.articles.length === 0}
		<p class="text-gray-600">No articles available yet.</p>
	{:else}
		<div class="space-y-6">
			{#each data.articles as article}
				<article class="border-b border-gray-200 pb-6 last:border-b-0">
					<a href="/articles/{article.slug}" class="group">
						<h2 class="text-2xl font-semibold mb-2 group-hover:text-blue-600 transition">
							{article.title}
							{#if article.isPremium}
								<span class="text-yellow-500 text-xl ml-2" title="Premium content">🔒</span>
							{/if}
						</h2>
					</a>

					{#if article.excerpt}
						<p class="text-gray-700 mb-2">{article.excerpt}</p>
					{/if}

					{#if article.publishedAt}
						<time class="text-sm text-gray-500" datetime={article.publishedAt}>
							{new Date(article.publishedAt).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</time>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</div>
