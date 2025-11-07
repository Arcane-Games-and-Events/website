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
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
</script>

<svelte:head>
	<title>{data.article.title}</title>
	{#if data.article.excerpt}
		<meta name="description" content={data.article.excerpt} />
	{/if}
</svelte:head>

<article class="container mx-auto px-4 py-8 max-w-3xl">
	<header class="mb-8">
		<h1 class="text-4xl font-bold mb-4">
			{data.article.title}
			{#if data.isPremium}
				<span class="text-yellow-500 text-2xl ml-2" title="Premium content">🔒</span>
			{/if}
		</h1>

		{#if data.article.publishedAt}
			<time class="text-gray-600" datetime={data.article.publishedAt}>
				{new Date(data.article.publishedAt).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</time>
		{/if}
	</header>

	<div class="prose prose-lg max-w-none">
		{#if data.article.content}
			{@html renderContent(data.article.content)}
		{:else}
			<p class="text-gray-500">No content available.</p>
		{/if}
	</div>

	<footer class="mt-12 pt-6 border-t border-gray-200">
		<a href="/articles" class="text-blue-600 hover:underline">&larr; Back to all articles</a>
	</footer>
</article>

<style>
	:global(.prose) {
		color: #374151;
		line-height: 1.75;
	}

	:global(.prose h1) {
		font-size: 2.25em;
		font-weight: 700;
		margin-top: 0;
		margin-bottom: 0.8888889em;
	}

	:global(.prose h2) {
		font-size: 1.5em;
		font-weight: 600;
		margin-top: 2em;
		margin-bottom: 1em;
	}

	:global(.prose h3) {
		font-size: 1.25em;
		font-weight: 600;
		margin-top: 1.6em;
		margin-bottom: 0.6em;
	}

	:global(.prose p) {
		margin-top: 1.25em;
		margin-bottom: 1.25em;
	}

	:global(.prose a) {
		color: #2563eb;
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
		background-color: #f3f4f6;
		padding: 0.2em 0.4em;
		border-radius: 0.25rem;
		font-size: 0.875em;
	}

	:global(.prose pre) {
		background-color: #1f2937;
		color: #f9fafb;
		padding: 1em;
		border-radius: 0.5rem;
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
		border-left: 4px solid #e5e7eb;
		padding-left: 1em;
		font-style: italic;
		color: #6b7280;
		margin-top: 1.5em;
		margin-bottom: 1.5em;
	}

	:global(.prose img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		margin-top: 2em;
		margin-bottom: 2em;
	}
</style>
