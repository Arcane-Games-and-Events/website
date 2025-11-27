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
	<title>{data.article.title} - AGE</title>
	{#if data.article.excerpt}
		<meta name="description" content={data.article.excerpt} />
	{/if}
</svelte:head>

<div class="min-h-screen">
	<!-- Header Bar -->
	<div class="border-b border-white/10 bg-gray-900/50">
		<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
			<a href="/read" class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
				</svg>
				Back to all articles
			</a>
		</div>
	</div>

	<!-- Hero Section with Cover Image and Title Overlay -->
	<header class="relative">
		<!-- Cover Image Container - Taller on mobile for better visual impact -->
		<div class="relative aspect-[3/4] w-full overflow-hidden bg-gray-900 sm:aspect-[16/9] lg:aspect-[21/9]">
			{#if data.article.coverImage}
				<img
					src={data.article.coverImage}
					alt={data.article.title}
					class="h-full w-full object-cover"
					loading="eager"
				/>
				<!-- Gradient Overlay for text readability - stronger on mobile -->
				<div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20 sm:from-black/90 sm:via-black/50 sm:to-transparent"></div>
			{:else}
				<!-- Fallback gradient when no cover image -->
				<div class="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"></div>
			{/if}

			<!-- Text Content Overlay -->
			<div class="absolute inset-0 flex items-end">
				<div class="w-full px-4 pb-6 sm:px-6 sm:pb-12 lg:px-8 lg:pb-16">
					<div class="mx-auto max-w-7xl">
						<!-- Tags & Premium Badge -->
						<div class="mb-3 flex flex-wrap items-center gap-2 sm:mb-4 sm:gap-3">
							{#if data.article.tags && data.article.tags.length > 0}
								<a
									href="/read/tag/{data.article.tags[0].slug}"
									class="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400 backdrop-blur-sm hover:bg-blue-500/30 hover:text-blue-300 transition-colors sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm"
								>
									{data.article.tags[0].name}
								</a>
							{/if}
							<span class="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm {data.isPremium ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-200 sm:text-blue-400'}">
								{#if data.isPremium}
									<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
									</svg>
									Premium
								{:else}
									Free
								{/if}
							</span>
						</div>

						<!-- Title - Better sizing for mobile -->
						<h1 class="max-w-4xl text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl lg:text-5xl">
							{data.article.title}
						</h1>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Author Byline Section -->
	<div class="border-b border-white/10 bg-gray-900/30">
		<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
			<!-- Mobile Layout: Stack author and meta vertically -->
			<div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
				<!-- Author Info -->
				<div class="flex items-center justify-between sm:justify-start sm:gap-4">
					{#if data.article.author}
						<a href="/read/author/{data.article.author.slug}" class="flex items-center gap-3 group">
							{#if data.article.author.profilePicture}
								<img
									src={data.article.author.profilePicture}
									alt={data.article.author.name}
									class="h-11 w-11 rounded-full object-cover ring-2 ring-white/10 transition-all group-hover:ring-blue-400/50 sm:h-10 sm:w-10"
								/>
							{:else}
								<div class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white/10 transition-all group-hover:ring-blue-400/50 sm:h-10 sm:w-10">
									<span class="text-sm font-bold text-white">
										{data.article.author.name.charAt(0).toUpperCase()}
									</span>
								</div>
							{/if}
							<div>
								<span class="block text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
									{data.article.author.name}
								</span>
								<!-- Date and read time on mobile only - below author name -->
								<div class="flex items-center gap-2 text-xs text-gray-400 sm:hidden">
									{#if data.article.publishedAt}
										<time datetime={data.article.publishedAt}>
											{new Date(data.article.publishedAt).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
										</time>
									{/if}
									{#if data.article.readTime}
										<span class="text-gray-600">·</span>
										<span>{data.article.readTime} min read</span>
									{/if}
								</div>
							</div>
						</a>
					{/if}

					<!-- Share Buttons - Visible on mobile inline with author -->
					<div class="flex items-center gap-1 sm:hidden">
						<button
							on:click={copyLink}
							class="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
							title="Copy link"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
						</button>
						<button
							on:click={shareTwitter}
							class="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
							title="Share on Twitter"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
							</svg>
						</button>
					</div>
				</div>

				<!-- Date, read time, and share - Desktop only -->
				<div class="hidden sm:flex sm:items-center sm:gap-4">
					{#if data.article.publishedAt}
						<time class="text-sm text-gray-400" datetime={data.article.publishedAt}>
							{new Date(data.article.publishedAt).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</time>
					{/if}
					{#if data.article.readTime}
						<span class="text-gray-500">·</span>
						<span class="text-sm text-gray-400">{data.article.readTime} min read</span>
					{/if}

					<!-- Share Buttons - Desktop -->
					<div class="flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
						<span class="text-xs text-gray-500 uppercase tracking-wider mr-1">Share</span>
						<button
							on:click={copyLink}
							class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
							title="Copy link"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
						</button>
						<button
							on:click={shareTwitter}
							class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
							title="Share on Twitter"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content Area with Sidebar -->
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
		<div class="lg:grid lg:grid-cols-[5fr_3fr] lg:gap-12">
			<!-- Main Content -->
			<article class="min-w-0">
				<!-- Article content using Tailwind Typography - Optimized for mobile readability -->
				<div class="prose prose-invert prose-base mx-auto max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:scroll-mt-24 prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-xl prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-lg prose-h4:mt-5 prose-h4:mb-2 prose-h4:text-base prose-p:text-gray-300 prose-p:leading-relaxed prose-a:text-yellow-600 prose-a:no-underline hover:prose-a:text-yellow-500 hover:prose-a:underline prose-strong:text-white prose-em:text-gray-200 prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-orange-400 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-white/10 prose-pre:bg-gray-900 prose-blockquote:rounded-r-lg prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-500/10 prose-blockquote:not-italic prose-blockquote:pl-4 prose-li:marker:text-blue-500 prose-img:rounded-xl prose-hr:border-white/10 sm:prose-lg sm:max-w-[34em] sm:prose-h2:mt-10 sm:prose-h2:mb-4 sm:prose-h2:text-3xl sm:prose-h3:mt-8 sm:prose-h3:mb-3 sm:prose-h3:text-2xl sm:prose-h4:mt-6 sm:prose-h4:mb-3 sm:prose-h4:text-xl lg:prose-xl">
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

				<!-- Tags Footer -->
				{#if data.article.tags && data.article.tags.length > 1}
					<div class="mx-auto mt-8 max-w-none border-t border-white/10 pt-6 sm:mt-12 sm:max-w-[34em] sm:pt-8">
						<h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:mb-4">Topics</h3>
						<div class="flex flex-wrap gap-2">
							{#each data.article.tags as tag}
								<a
									href="/read/tag/{tag.slug}"
									class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-gray-300 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300 sm:px-4 sm:py-1.5"
								>
									{tag.name}
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Author Card Footer -->
				{#if data.article.author}
					<div class="mx-auto mt-8 max-w-none rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:mt-12 sm:max-w-[34em] sm:rounded-2xl sm:p-6">
						<a href="/read/author/{data.article.author.slug}" class="flex items-center gap-3 group sm:items-start sm:gap-4">
							{#if data.article.author.profilePicture}
								<img
									src={data.article.author.profilePicture}
									alt={data.article.author.name}
									class="h-12 w-12 shrink-0 rounded-lg object-cover ring-2 ring-white/10 transition-all group-hover:ring-blue-400/50 sm:h-16 sm:w-16 sm:rounded-xl"
								/>
							{:else}
								<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white/10 transition-all group-hover:ring-blue-400/50 sm:h-16 sm:w-16 sm:rounded-xl">
									<span class="text-lg font-bold text-white sm:text-xl">
										{data.article.author.name.charAt(0).toUpperCase()}
									</span>
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<div class="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">Written by</div>
								<div class="mt-0.5 text-base font-bold text-white group-hover:text-blue-400 transition-colors sm:mt-1 sm:text-lg">
									{data.article.author.name}
								</div>
								<p class="mt-0.5 text-xs text-gray-400 sm:mt-1 sm:text-sm">View all articles by this author →</p>
							</div>
						</a>
					</div>
				{/if}

				<!-- Back Link Footer -->
				<footer class="mx-auto mt-8 max-w-none border-t border-white/10 pt-6 sm:mt-12 sm:max-w-[34em] sm:pt-8">
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

			<!-- Right Sidebar - Table of Contents -->
			<aside class="hidden lg:block">
				<div class="sticky top-8">
					{#if tableOfContents.length > 0}
						<nav class="rounded-xl border border-white/10 bg-gray-900/30 p-5">
							<h2 class="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">On this page</h2>
							<div class="space-y-2.5">
								{#each tableOfContents as heading}
									<a
										href="#{heading.id}"
										class="block text-sm leading-snug transition-colors {activeSection === heading.id ? 'font-medium text-white' : 'text-gray-500 hover:text-gray-300'}"
										style="padding-left: {(heading.level - 2) * 12}px"
									>
										{heading.text}
									</a>
								{/each}
							</div>
						</nav>
					{/if}
				</div>
			</aside>
		</div>
	</div>
</div>

<!-- Card Hover Component -->
<CardHover />
