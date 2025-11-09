<script>
	export let data;

	// Render Strapi rich text content as HTML
	// Strapi v5 uses blocks-based format (similar to Portable Text)
	function renderContent(content) {
		if (!content) return '';

		// If content is a string, return it directly
		if (typeof content === 'string') {
			return content;
		}

		// If content is an array of blocks (Strapi v5 format)
		if (Array.isArray(content)) {
			return content.map(block => renderBlock(block)).join('');
		}

		// If content is an object, try to extract text
		if (typeof content === 'object') {
			return JSON.stringify(content, null, 2);
		}

		return '';
	}

	function renderBlock(block) {
		if (!block || !block.type) return '';

		switch (block.type) {
			case 'paragraph':
				return `<p>${renderChildren(block.children)}</p>`;
			case 'heading':
				const level = block.level || 2;
				return `<h${level}>${renderChildren(block.children)}</h${level}>`;
			case 'list':
				const tag = block.format === 'ordered' ? 'ol' : 'ul';
				return `<${tag}>${renderChildren(block.children)}</${tag}>`;
			case 'list-item':
				return `<li>${renderChildren(block.children)}</li>`;
			case 'quote':
				return `<blockquote>${renderChildren(block.children)}</blockquote>`;
			case 'code':
				return `<pre><code>${escapeHtml(block.children?.[0]?.text || '')}</code></pre>`;
			default:
				return renderChildren(block.children);
		}
	}

	function renderChildren(children) {
		if (!children || !Array.isArray(children)) return '';

		return children.map(child => {
			if (child.type === 'text' || typeof child.text === 'string') {
				let text = escapeHtml(child.text);

				// Apply formatting
				if (child.bold) text = `<strong>${text}</strong>`;
				if (child.italic) text = `<em>${text}</em>`;
				if (child.underline) text = `<u>${text}</u>`;
				if (child.strikethrough) text = `<s>${text}</s>`;
				if (child.code) text = `<code>${text}</code>`;

				// Handle links
				if (child.type === 'link') {
					text = `<a href="${child.url}">${renderChildren(child.children)}</a>`;
				}

				return text;
			}

			return renderBlock(child);
		}).join('');
	}

	function escapeHtml(text) {
		if (!text) return '';
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
</script>

<svelte:head>
	<title>{data.article.title} - Arcane Games and Events</title>
	{#if data.article.excerpt}
		<meta name="description" content={data.article.excerpt} />
	{/if}
</svelte:head>

<article class="container mx-auto px-4 py-12 max-w-4xl">
	<!-- Back Link -->
	<div class="mb-8">
		<a href="/articles" class="inline-flex items-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors text-sm font-medium">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Articles
		</a>
	</div>

	<!-- Article Header -->
	<header class="mb-8 pb-8 border-b border-[hsl(var(--border))]">
		{#if data.isPremium}
			<div class="flex gap-2 mb-4">
				<span class="px-3 py-1 text-xs rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-medium">
					Premium Content
				</span>
			</div>
		{/if}

		<h1 class="text-4xl sm:text-5xl font-bold mb-4 text-[hsl(var(--foreground))]">
			{data.article.title}
		</h1>

		{#if data.article.publishedAt}
			<time class="text-sm text-[hsl(var(--muted-foreground))]" datetime={data.article.publishedAt}>
				{new Date(data.article.publishedAt).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</time>
		{/if}
	</header>

	<!-- Article Content -->
	<div class="prose prose-lg max-w-none">
		{#if data.article.content}
			{@html renderContent(data.article.content)}
		{:else}
			<p class="text-[hsl(var(--muted-foreground))]">No content available.</p>
		{/if}
	</div>

	<!-- Article Footer -->
	<footer class="mt-12 pt-8 border-t border-[hsl(var(--border))]">
		<a href="/articles" class="inline-flex items-center gap-2 text-[hsl(var(--primary))] hover:underline font-medium">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to all articles
		</a>
	</footer>
</article>

<style>
	:global(.prose) {
		color: hsl(var(--foreground));
		line-height: 1.75;
	}

	:global(.prose h1) {
		font-size: 2.25em;
		font-weight: 700;
		margin-top: 0;
		margin-bottom: 0.8888889em;
		color: hsl(var(--foreground));
	}

	:global(.prose h2) {
		font-size: 1.5em;
		font-weight: 600;
		margin-top: 2em;
		margin-bottom: 1em;
		color: hsl(var(--foreground));
	}

	:global(.prose h3) {
		font-size: 1.25em;
		font-weight: 600;
		margin-top: 1.6em;
		margin-bottom: 0.6em;
		color: hsl(var(--foreground));
	}

	:global(.prose p) {
		margin-top: 1.25em;
		margin-bottom: 1.25em;
	}

	:global(.prose a) {
		color: hsl(var(--primary));
		text-decoration: underline;
	}

	:global(.prose ul),
	:global(.prose ol) {
		margin-top: 1.25em;
		margin-bottom: 1.25em;
		padding-left: 1.625em;
	}

	:global(.prose li) {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
	}

	:global(.prose code) {
		background-color: hsl(var(--muted));
		padding: 0.2em 0.4em;
		border-radius: var(--radius);
		font-size: 0.875em;
		color: hsl(var(--foreground));
	}

	:global(.prose pre) {
		background-color: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		padding: 1em;
		border-radius: var(--radius);
		overflow-x: auto;
		margin-top: 1.5em;
		margin-bottom: 1.5em;
	}

	:global(.prose pre code) {
		background-color: transparent;
		padding: 0;
		color: inherit;
	}

	:global(.prose blockquote) {
		border-left: 4px solid hsl(var(--border));
		padding-left: 1em;
		font-style: italic;
		color: hsl(var(--muted-foreground));
		margin-top: 1.5em;
		margin-bottom: 1.5em;
	}

	:global(.prose img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius);
		margin-top: 2em;
		margin-bottom: 2em;
	}
</style>
