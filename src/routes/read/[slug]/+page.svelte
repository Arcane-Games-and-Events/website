<script>
	import { onMount } from 'svelte';
	import CardHover from '$lib/components/CardHover.svelte';
	import Decklist from '$lib/components/Decklist.svelte';

	export let data;

	// Process content blocks for inline decklists
	let renderBlocks = [];
	let tableOfContents = [];
	let activeSection = '';

	$: {
		if (data.article.content) {
			renderBlocks = processInlineDecklists(data.article.content, data.article.decklists);
			tableOfContents = extractHeadings(data.article.content);
		}
	}

	// Extract headings for table of contents
	function extractHeadings(content) {
		const headings = [];
		if (!content) return headings;

		// Handle Lexical format
		if (content.root && content.root.type === 'root') {
			extractLexicalHeadings(content.root, headings);
		}
		// Handle array format
		else if (Array.isArray(content)) {
			content.forEach((block) => {
				if (block.type === 'heading' && block.children) {
					const text = extractText(block.children);
					const id = slugify(text);
					headings.push({
						text,
						id,
						level: block.level || 2
					});
				}
			});
		}

		return headings;
	}

	function extractLexicalHeadings(node, headings) {
		if (!node) return;

		if (node.type === 'heading') {
			const text = extractLexicalText(node.children);
			const id = slugify(text);
			const level = parseInt(node.tag?.replace('h', '')) || 2;
			headings.push({ text, id, level });
		}

		if (node.children) {
			node.children.forEach(child => extractLexicalHeadings(child, headings));
		}
	}

	function extractText(children) {
		if (!children) return '';
		return children.map(child => child.text || '').join('');
	}

	function extractLexicalText(children) {
		if (!children) return '';
		return children.map(child => child.text || extractLexicalText(child.children)).join('');
	}

	function slugify(text) {
		return text
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}

	// Scroll spy for active section
	onMount(() => {
		const handleScroll = () => {
			const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
			let currentSection = '';

			headings.forEach((heading) => {
				const rect = heading.getBoundingClientRect();
				if (rect.top <= 150) {
					currentSection = heading.id;
				}
			});

			activeSection = currentSection;
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function copyLink() {
		navigator.clipboard.writeText(window.location.href);
	}

	function shareTwitter() {
		const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(data.article.title)}`;
		window.open(url, '_blank', 'width=550,height=420');
	}

	function shareFacebook() {
		const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
		window.open(url, '_blank', 'width=550,height=420');
	}

	function shareLinkedIn() {
		const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
		window.open(url, '_blank', 'width=550,height=420');
	}

	/**
	 * Process content blocks and replace [DECKLIST:n] markers with actual decklists
	 */
	function processInlineDecklists(content, decklists) {
		if (!content) {
			return [{ type: 'html', content: '' }];
		}

		// Render the full content to HTML first
		const fullHtml = renderContent(content);

		// Check for decklist markers
		const decklistPattern = /\[DECKLIST:(\d+)\]/g;
		const matches = [...fullHtml.matchAll(decklistPattern)];

		// If no markers, return as single HTML block
		if (matches.length === 0) {
			return [{ type: 'html', content: fullHtml }];
		}

		// Split content at decklist markers
		const blocks = [];
		let lastIndex = 0;

		matches.forEach(match => {
			// Add HTML before the marker
			const beforeMarker = fullHtml.substring(lastIndex, match.index);
			if (beforeMarker.trim()) {
				blocks.push({ type: 'html', content: beforeMarker });
			}

			// Add decklist component
			const decklistIndex = parseInt(match[1]);
			if (decklists && decklists[decklistIndex]) {
				blocks.push({
					type: 'decklist',
					data: decklists[decklistIndex]
				});
			}

			lastIndex = match.index + match[0].length;
		});

		// Add remaining HTML after last marker
		const afterLast = fullHtml.substring(lastIndex);
		if (afterLast.trim()) {
			blocks.push({ type: 'html', content: afterLast });
		}

		return blocks;
	}

	// Render rich text content as HTML
	function renderContent(content) {
		if (!content) return '';

		// If content is a string, return it directly
		if (typeof content === 'string') {
			return content;
		}

		// Check if this is Lexical format (Payload v3)
		if (content.root && content.root.type === 'root') {
			return renderLexicalNode(content.root);
		}

		// If content is an array of blocks
		if (Array.isArray(content)) {
			return content.map((block) => renderBlock(block)).join('');
		}

		// If content is an object, try to extract text
		if (typeof content === 'object') {
			return JSON.stringify(content, null, 2);
		}

		return '';
	}

	// Render Lexical JSON to HTML (Payload v3 format)
	function renderLexicalNode(node) {
		if (!node) return '';

		// Handle text nodes
		if (node.type === 'text') {
			let text = escapeHtml(node.text || '');

			// Apply formatting based on format bitmask
			if (node.format) {
				const format = typeof node.format === 'number' ? node.format : 0;
				if (format & 1 || node.bold) text = `<strong>${text}</strong>`;
				if (format & 2 || node.italic) text = `<em>${text}</em>`;
				if (format & 4 || node.strikethrough) text = `<s>${text}</s>`;
				if (format & 8 || node.underline) text = `<u>${text}</u>`;
				if (format & 16 || node.code) text = `<code>${text}</code>`;
			}

			return text;
		}

		// Handle paragraph
		if (node.type === 'paragraph') {
			const children = renderLexicalChildren(node.children);
			return `<p>${children}</p>`;
		}

		// Handle headings with ID for table of contents
		if (node.type === 'heading') {
			const tag = node.tag || 'h2';
			const children = renderLexicalChildren(node.children);
			const text = extractLexicalText(node.children);
			const id = slugify(text);
			return `<${tag} id="${id}">${children}</${tag}>`;
		}

		// Handle lists
		if (node.type === 'list') {
			const tag = node.listType === 'number' ? 'ol' : 'ul';
			const children = renderLexicalChildren(node.children);
			return `<${tag}>${children}</${tag}>`;
		}

		if (node.type === 'listitem') {
			const children = renderLexicalChildren(node.children);
			return `<li>${children}</li>`;
		}

		// Handle quotes
		if (node.type === 'quote') {
			const children = renderLexicalChildren(node.children);
			return `<blockquote>${children}</blockquote>`;
		}

		// Handle code blocks
		if (node.type === 'code') {
			const code = node.children?.map(c => c.text || '').join('') || '';
			return `<pre><code>${escapeHtml(code)}</code></pre>`;
		}

		// Handle inline images (upload blocks)
		if (node.type === 'upload') {
			const media = node.value || node;
			const imageUrl = media.url || '';
			const altText = media.alt || media.filename || '';

			return `<figure class="my-8"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" class="rounded-lg" /></figure>`;
		}

		// Handle links
		if (node.type === 'link' || node.type === 'autolink') {
			const children = renderLexicalChildren(node.children);
			const rawUrl = node.url || node.fields?.url || '#';

			// Check if this is a card link
			const cardMatch = rawUrl.match(/^card:(.+)$/);
			if (cardMatch) {
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

				try {
					cardId = decodeURIComponent(cardId);
				} catch (e) {
					console.warn('Failed to decode card ID:', cardId);
				}

				const linkUrl = customUrl || `https://cards.fabtcg.com/?search=${encodeURIComponent(cardId)}`;

				return `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" data-card-name="${escapeHtml(cardId)}" class="card-link">${children}</a>`;
			} else {
				const url = escapeHtml(rawUrl);
				return `<a href="${url}" target="_blank" rel="noopener noreferrer">${children}</a>`;
			}
		}

		// Handle root and other container nodes
		if (node.children) {
			return renderLexicalChildren(node.children);
		}

		return '';
	}

	function renderLexicalChildren(children) {
		if (!children || !Array.isArray(children)) return '';
		return children.map(child => renderLexicalNode(child)).join('');
	}

	function renderBlock(block) {
		if (!block || !block.type) return '';

		switch (block.type) {
			case 'paragraph':
				return `<p>${renderChildren(block.children)}</p>`;
			case 'heading':
				const level = block.level || 2;
				const text = extractText(block.children);
				const id = slugify(text);
				return `<h${level} id="${id}">${renderChildren(block.children)}</h${level}>`;
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
				let imageHtml = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" />`;
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
				// Handle links
				if (child.type === 'link') {
					const cardMatch = child.url?.match(/^card:(.+)$/);
					if (cardMatch) {
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

						try {
							cardId = decodeURIComponent(cardId);
						} catch (e) {
							console.warn('Failed to decode card ID:', cardId);
						}

						const linkUrl = customUrl || `https://cards.fabtcg.com/?search=${encodeURIComponent(cardId)}`;

						return `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" data-card-name="${escapeHtml(cardId)}" class="card-link">${renderChildren(child.children)}</a>`;
					} else {
						return `<a href="${escapeHtml(child.url || '#')}" target="_blank" rel="noopener noreferrer">${renderChildren(child.children)}</a>`;
					}
				}

				// Handle text nodes
				if (child.type === 'text' || typeof child.text === 'string') {
					let text = escapeHtml(child.text);

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

<!-- Hero Section with Gradient Overlay -->
<div class="relative min-h-[500px] w-full overflow-hidden bg-gradient-to-br from-orange-900/20 via-gray-900 to-black">
	{#if data.article.coverImage}
		<div class="absolute inset-0">
			<img
				src={data.article.coverImage}
				alt={data.article.title}
				class="h-full w-full object-cover opacity-40"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60"></div>
		</div>
	{/if}

	<!-- Hero Content -->
	<div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
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

		<!-- Tags & Premium Badge -->
		<div class="mb-6 flex flex-wrap items-center gap-3">
			{#if data.isPremium}
				<span class="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
					Premium
				</span>
			{/if}
			{#if data.article.tags && data.article.tags.length > 0}
				{#each data.article.tags as tag}
					<span class="rounded-md border border-gray-700 bg-gray-800/50 px-3 py-1 text-xs font-medium text-gray-300 backdrop-blur-sm">
						{tag.name}
					</span>
				{/each}
			{/if}
		</div>

		<!-- Title -->
		<h1 class="mb-6 max-w-4xl text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
			{data.article.title}
		</h1>

		<!-- Author & Date -->
		<div class="flex items-center gap-4">
			{#if data.article.author}
				<div class="flex items-center gap-3">
					{#if data.article.author.profilePicture}
						<img
							src={data.article.author.profilePicture}
							alt={data.article.author.name}
							class="h-12 w-12 rounded-full object-cover ring-2 ring-white/20"
						/>
					{:else}
						<div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
							<span class="text-base font-semibold text-white">
								{data.article.author.name.charAt(0).toUpperCase()}
							</span>
						</div>
					{/if}
					<div>
						<div class="text-sm font-semibold text-white">
							{data.article.author.name}
						</div>
						{#if data.article.publishedAt}
							<time class="text-sm text-gray-400" datetime={data.article.publishedAt}>
								{new Date(data.article.publishedAt).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
								· 5 min read
							</time>
						{/if}
					</div>
				</div>
			{:else if data.article.publishedAt}
				<time class="text-sm text-gray-400" datetime={data.article.publishedAt}>
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

<!-- Main Content Area with Sidebar -->
<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
	<div class="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
		<!-- Left Sidebar - Table of Contents & Share -->
		<aside class="hidden lg:block">
			<div class="sticky top-8 space-y-8">
				<!-- Table of Contents -->
				{#if tableOfContents.length > 0}
					<nav>
						<h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">On this page</h2>
						<div class="space-y-1.5 border-l border-gray-800 pl-4">
							{#each tableOfContents as heading}
								<a
									href="#{heading.id}"
									class="block text-xs leading-relaxed transition-colors {activeSection === heading.id ? 'font-medium text-orange-400' : 'text-gray-500 hover:text-gray-300'}"
									style="padding-left: {(heading.level - 2) * 10}px"
								>
									{heading.text}
								</a>
							{/each}
						</div>
					</nav>
				{/if}

				<!-- Share Buttons -->
				<div>
					<h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Share</h3>
					<div class="flex gap-2">
						<button
							on:click={copyLink}
							class="flex h-9 w-9 items-center justify-center rounded-md border border-gray-800 bg-gray-900/50 text-gray-400 transition-all hover:border-gray-700 hover:bg-gray-800 hover:text-white"
							title="Copy link"
							aria-label="Copy link"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
						</button>
						<button
							on:click={shareLinkedIn}
							class="flex h-9 w-9 items-center justify-center rounded-md border border-gray-800 bg-gray-900/50 text-gray-400 transition-all hover:border-gray-700 hover:bg-gray-800 hover:text-white"
							title="Share on LinkedIn"
							aria-label="Share on LinkedIn"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
							</svg>
						</button>
						<button
							on:click={shareTwitter}
							class="flex h-9 w-9 items-center justify-center rounded-md border border-gray-800 bg-gray-900/50 text-gray-400 transition-all hover:border-gray-700 hover:bg-gray-800 hover:text-white"
							title="Share on Twitter"
							aria-label="Share on Twitter"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
							</svg>
						</button>
						<button
							on:click={shareFacebook}
							class="flex h-9 w-9 items-center justify-center rounded-md border border-gray-800 bg-gray-900/50 text-gray-400 transition-all hover:border-gray-700 hover:bg-gray-800 hover:text-white"
							title="Share on Facebook"
							aria-label="Share on Facebook"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</aside>

		<!-- Main Content -->
		<article class="min-w-0">
			<!-- Constrained readable width for optimal line length -->
			<div class="mx-auto max-w-[680px]">
				<div class="prose prose-lg prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white prose-headings:scroll-mt-24 prose-h1:text-4xl prose-h1:leading-tight prose-h2:mt-16 prose-h2:mb-6 prose-h2:text-3xl prose-h2:leading-snug prose-h3:mt-12 prose-h3:mb-4 prose-h3:text-2xl prose-h3:leading-snug prose-h4:mt-8 prose-h4:mb-3 prose-h4:text-xl prose-p:mb-6 prose-p:text-[19px] prose-p:leading-[1.7] prose-p:text-gray-300 prose-a:font-medium prose-a:text-orange-400 prose-a:no-underline prose-a:transition-colors hover:prose-a:text-orange-300 hover:prose-a:underline prose-strong:font-semibold prose-strong:text-white prose-em:text-gray-200 prose-code:rounded prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.9em] prose-code:text-orange-400 prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-lg prose-pre:border prose-pre:border-gray-800 prose-pre:bg-gray-900 prose-pre:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-gray-900/30 prose-blockquote:py-4 prose-blockquote:pl-6 prose-blockquote:not-italic prose-blockquote:text-gray-300 prose-ul:my-6 prose-ul:text-gray-300 prose-ol:my-6 prose-ol:text-gray-300 prose-li:my-2 prose-li:leading-[1.7] prose-li:marker:text-orange-500 prose-img:rounded-lg prose-img:border prose-img:border-gray-800">
					{#if data.article.content}
						{#if renderBlocks.length > 0}
							{#each renderBlocks as block}
								{#if block.type === 'html'}
									{@html block.content}
								{:else if block.type === 'decklist'}
									<Decklist
										deckName={block.data.deckName}
										creator={block.data.creator}
										hero={block.data.hero}
										format={block.data.format}
										fabraryUrl={block.data.fabraryUrl}
										parsedCards={block.data.parsedCards}
									/>
								{/if}
							{/each}
						{:else}
							{@html renderContent(data.article.content)}
						{/if}
					{:else}
						<p class="text-gray-400">No content available.</p>
					{/if}
				</div>
			</div>

			<!-- Article Footer -->
			<footer class="mx-auto mt-16 max-w-[680px] border-t border-gray-800 pt-8">
				<a
					href="/read"
					class="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to all articles
				</a>
			</footer>
		</article>
	</div>
</div>

<!-- Card Hover Component -->
<CardHover />
