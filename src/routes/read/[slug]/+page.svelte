<script>
	import CardHover from '$lib/components/CardHover.svelte';
	import Decklist from '$lib/components/Decklist.svelte';

	export let data;

	// Separate content into regular blocks and decklist blocks
	let contentBlocks = [];
	let decklistBlocks = [];

	$: {
		if (data.article.content) {
			const { regular, decklists } = parseContent(data.article.content);
			contentBlocks = regular;
			decklistBlocks = decklists;
		}
	}

	/**
	 * Parse content and separate regular blocks from decklist blocks
	 */
	function parseContent(content) {
		if (!content) return { regular: [], decklists: [] };

		// If content is a string, return it as a single block
		if (typeof content === 'string') {
			return { regular: [{ html: content, index: 0 }], decklists: [] };
		}

		// If content is an array of blocks (Strapi v5 format)
		if (Array.isArray(content)) {
			const regular = [];
			const decklists = [];
			let currentHtml = '';
			let blockIndex = 0;

			// Strapi splits code blocks line-by-line, so we need to accumulate consecutive JSON code blocks
			let accumulatedJsonLines = [];

			const processAccumulatedJson = () => {
				if (accumulatedJsonLines.length > 0) {
					const fullJson = accumulatedJsonLines.join('\n');
					try {
						const parsed = JSON.parse(fullJson);

						// Check if this looks like a decklist (has a 'cards' array)
						if (parsed.cards && Array.isArray(parsed.cards)) {
							// Save current HTML if any
							if (currentHtml) {
								regular.push({ html: currentHtml, index: blockIndex++ });
								currentHtml = '';
							}

							decklists.push({ ...parsed, index: blockIndex++ });
						} else {
							// Not a decklist, render as code block
							currentHtml += `<pre><code>${escapeHtml(fullJson)}</code></pre>`;
						}
					} catch (e) {
						// Invalid JSON, render as code block
						currentHtml += `<pre><code>${escapeHtml(fullJson)}</code></pre>`;
					}

					accumulatedJsonLines = [];
				}
			};

			content.forEach((block, idx) => {
				// Check if this is a decklist block
				if (block.type === 'decklist') {
					// Process any accumulated JSON first
					processAccumulatedJson();

					// Custom decklist block type
					try {
						let decklistData = {};
						if (typeof block.data === 'string') {
							decklistData = JSON.parse(block.data);
						} else {
							decklistData = block.data || {};
						}

						if (currentHtml) {
							regular.push({ html: currentHtml, index: blockIndex++ });
							currentHtml = '';
						}

						decklists.push({ ...decklistData, index: blockIndex++ });
					} catch (e) {
						console.error('Failed to parse decklist data:', e);
					}
				} else if (block.type === 'code' && block.language === 'json') {
					// Accumulate JSON code block lines
					const codeContent = block.code || block.children?.[0]?.text || block.content || '';
					accumulatedJsonLines.push(codeContent);
				} else {
					// Non-JSON block - process any accumulated JSON first
					processAccumulatedJson();

					// Regular block - add to current HTML
					currentHtml += renderBlock(block);
				}
			});

			// Process any remaining accumulated JSON at the end
			processAccumulatedJson();

			// Add remaining HTML
			if (currentHtml) {
				regular.push({ html: currentHtml, index: blockIndex });
			}

			return { regular, decklists };
		}

		// If content is an object, try to extract text
		if (typeof content === 'object') {
			return { regular: [{ html: JSON.stringify(content, null, 2), index: 0 }], decklists: [] };
		}

		return { regular: [], decklists: [] };
	}

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
			return content.map((block) => renderBlock(block)).join('');
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
			case 'image':
				const imageUrl = block.image?.url || '';
				const altText = block.image?.alternativeText || block.image?.name || '';
				const caption = block.image?.caption || '';
				let imageHtml = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" />`;
				if (caption) {
					imageHtml = `<figure>${imageHtml}<figcaption>${escapeHtml(caption)}</figcaption></figure>`;
				}
				return imageHtml;
			default:
				return renderChildren(block.children);
		}
	}

	function renderChildren(children) {
		if (!children || !Array.isArray(children)) return '';

		return children
			.map((child) => {
				// Handle links first
				if (child.type === 'link') {
					// Check if this is a card link (has card: prefix)
					const cardMatch = child.url?.match(/^card:(.+)$/);
					if (cardMatch) {
						// Format: card:CARDID or card:CARDID|URL
						// Use | as delimiter to avoid conflicts with : in URLs
						const fullString = cardMatch[1];
						const pipeIndex = fullString.indexOf('|');

						let cardId, customUrl;
						if (pipeIndex !== -1) {
							cardId = fullString.substring(0, pipeIndex);
							customUrl = fullString.substring(pipeIndex + 1);
						} else {
							cardId = fullString;
							customUrl = null;
						}

						// If custom URL provided, use it; otherwise generate cards.fabtcg.com URL
						const linkUrl =
							customUrl || `https://cards.fabtcg.com/?search=${encodeURIComponent(cardId)}`;

						return `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" data-card-name="${escapeHtml(cardId)}" class="card-link">${renderChildren(child.children)}</a>`;
					} else {
						return `<a href="${escapeHtml(child.url || '#')}">${renderChildren(child.children)}</a>`;
					}
				}

				// Handle text nodes
				if (child.type === 'text' || typeof child.text === 'string') {
					let text = escapeHtml(child.text);

					// Apply formatting
					if (child.bold) text = `<strong>${text}</strong>`;
					if (child.italic) text = `<em>${text}</em>`;
					if (child.underline) text = `<u>${text}</u>`;
					if (child.strikethrough) text = `<s>${text}</s>`;
					if (child.code) text = `<code>${text}</code>`;

					return text;
				}

				return renderBlock(child);
			})
			.join('');
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

<!-- Cover Image Banner (Full Width) -->
{#if data.article.coverImage}
	<div class="relative h-[800px] w-full overflow-hidden bg-gray-800 sm:h-[700px]">
		<!-- Cover Image -->
		<img
			src={data.article.coverImage}
			alt={data.article.title}
			class="h-full w-full object-cover"
		/>

		<!-- Gradient Overlay for better text visibility -->
		<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>

		<!-- Title Overlay (Bottom Left) -->
		<div class="absolute right-0 bottom-0 left-0 p-8 sm:p-12">
			<div class="container mx-auto max-w-4xl">
				{#if data.isPremium}
					<div class="mb-4 flex gap-2">
						<span
							class="rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white"
						>
							Premium Content
						</span>
					</div>
				{/if}

				<h1 class="mb-3 text-3xl font-bold text-white drop-shadow-lg sm:text-4xl md:text-5xl">
					{data.article.title}
				</h1>

				{#if data.article.publishedAt}
					<time class="text-sm text-white/90 drop-shadow" datetime={data.article.publishedAt}>
						{new Date(data.article.publishedAt).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</time>
				{/if}
			</div>
		</div>
	</div>
{/if}

<article class="container mx-auto max-w-4xl px-2 py-12">
	<!-- Back Link -->
	<div class="mb-8">
		<a
			href="/read"
			class="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Articles
		</a>
	</div>

	<!-- Article Header (only shown if no cover image) -->
	{#if !data.article.coverImage}
		<header class="mb-8 border-b border-gray-700 pb-8">
			{#if data.isPremium}
				<div class="mb-4 flex gap-2">
					<span
						class="rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white"
					>
						Premium Content
					</span>
				</div>
			{/if}

			<h1 class="mb-4 text-4xl font-bold text-gray-100 sm:text-5xl">
				{data.article.title}
			</h1>

			{#if data.article.publishedAt}
				<time
					class="text-sm text-gray-400"
					datetime={data.article.publishedAt}
				>
					{new Date(data.article.publishedAt).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
				</time>
			{/if}
		</header>
	{/if}

	<!-- Article Content -->
	<div class="prose prose-lg max-w-none">
		{#if data.article.content}
			{#if contentBlocks.length > 0 || decklistBlocks.length > 0}
				<!-- Render blocks in order -->
				{#each [...contentBlocks, ...decklistBlocks].sort((a, b) => a.index - b.index) as block}
					{#if block.html !== undefined}
						<!-- Regular content block -->
						{@html block.html}
					{:else}
						<!-- Decklist block -->
						<Decklist decklist={block} />
					{/if}
				{/each}
			{:else}
				{@html renderContent(data.article.content)}
			{/if}
		{:else}
			<p class="text-gray-400">No content available.</p>
		{/if}
	</div>

	<!-- Article Footer -->
	<footer class="mt-12 border-t border-gray-700 pt-8">
		<a
			href="/read"
			class="inline-flex items-center gap-2 font-medium text-white hover:underline"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to all articles
		</a>
	</footer>
</article>

<!-- Card Hover Component -->
<CardHover />

<style>
	:global(.prose) {
		color: rgb(243 244 246);
		line-height: 1.75;
	}

	:global(.prose h1) {
		font-size: 2.25em;
		font-weight: 700;
		margin-top: 0;
		margin-bottom: 0.8888889em;
		color: rgb(243 244 246);
	}

	:global(.prose h2) {
		font-size: 1.5em;
		font-weight: 600;
		margin-top: 2em;
		margin-bottom: 1em;
		color: rgb(243 244 246);
	}

	:global(.prose h3) {
		font-size: 1.25em;
		font-weight: 600;
		margin-top: 1.6em;
		margin-bottom: 0.6em;
		color: rgb(243 244 246);
	}

	:global(.prose p) {
		margin-top: 1.25em;
		margin-bottom: 1.25em;
	}

	:global(.prose a) {
		color: white;
		text-decoration: underline;
	}

	:global(.prose a.card-link) {
		color: white;
		text-decoration: underline;
		cursor: pointer;
		font-weight: 500;
	}

	:global(.prose a.card-link:hover) {
		color: rgb(59 130 246);
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
		background-color: rgb(31 41 55);
		padding: 0.2em 0.4em;
		border-radius: var(--radius);
		font-size: 0.875em;
		color: rgb(243 244 246);
	}

	:global(.prose pre) {
		background-color: white;
		color: rgb(17 24 39);
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
		border-left: 4px solid rgb(55 65 81);
		padding-left: 1em;
		font-style: italic;
		color: rgb(156 163 175);
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

	:global(.prose figure) {
		margin-top: 2em;
		margin-bottom: 2em;
	}

	:global(.prose figcaption) {
		text-align: center;
		font-size: 0.875em;
		color: rgb(156 163 175);
		margin-top: 0.5em;
		font-style: italic;
	}
</style>
