<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import Decklist from '$lib/components/Decklist.svelte';
	import CardHover from '$lib/components/CardHover.svelte';

	export let data;

	// Card images map from server for hover tooltips
	$: cardImages = data.cardImages || {};

	// Platform icons for author social links
	const platformIcons = {
		twitter: {
			icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
			color: 'text-gray-400 hover:text-white',
			fill: true
		},
		bluesky: {
			icon: 'M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z',
			color: 'text-blue-400 hover:text-blue-300',
			fill: true
		},
		youtube: {
			icon: 'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z M9.75 15.02l0-6.89 5.75 3.44z',
			color: 'text-red-400 hover:text-red-300',
			fill: true
		},
		twitch: {
			icon: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6.857 0L1.714 5.143v14.286h4.286v4.285L11.143 19.714h3.428l6.858-6.857V0H6.857zm13.714 11.571l-3.428 3.429h-3.429l-3 3v-3H6.857V1.714h13.714V11.57z',
			color: 'text-purple-400 hover:text-purple-300',
			fill: true
		},
		discord: {
			icon: 'M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z',
			color: 'text-indigo-400 hover:text-indigo-300',
			fill: true
		},
		patreon: {
			icon: 'M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003',
			color: 'text-orange-400 hover:text-orange-300',
			fill: true
		},
		metafy: {
			icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
			color: 'text-emerald-400 hover:text-emerald-300',
			fill: false
		},
		kofi: {
			icon: 'M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z',
			color: 'text-pink-400 hover:text-pink-300',
			fill: true
		},
		instagram: {
			icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
			color: 'text-pink-400 hover:text-pink-300',
			fill: true
		},
		tiktok: {
			icon: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
			color: 'text-gray-400 hover:text-white',
			fill: true
		},
		website: {
			icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
			color: 'text-gray-400 hover:text-gray-300',
			fill: true
		},
		other: {
			icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
			color: 'text-gray-400 hover:text-gray-300',
			fill: false
		}
	};

	const platformLabels = {
		twitter: 'Twitter / X',
		bluesky: 'Bluesky',
		youtube: 'YouTube',
		twitch: 'Twitch',
		discord: 'Discord',
		patreon: 'Patreon',
		metafy: 'Metafy',
		kofi: 'Ko-fi',
		instagram: 'Instagram',
		tiktok: 'TikTok',
		website: 'Website',
		other: 'Link'
	};

	function getLinkLabel(link) {
		return link.platform === 'other' && link.customLabel
			? link.customLabel
			: platformLabels[link.platform] || link.platform;
	}

	function getLinkIcon(link) {
		return platformIcons[link.platform] || platformIcons.other;
	}

	// Ensure URL has a protocol (https://) for external links
	function normalizeUrl(url) {
		if (!url) return '#';
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}
		if (url.startsWith('www.') || url.includes('.')) {
			return `https://${url}`;
		}
		return url;
	}

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

	/**
	 * Look up card image from the server-provided cardImages map
	 */
	function getCardImage(cardName, pitch) {
		const normalizedName = cardName.toLowerCase();
		const pitchKey = pitch ? `${normalizedName}:${pitch}` : null;

		if (pitchKey && cardImages[pitchKey]) {
			return cardImages[pitchKey];
		}

		if (cardImages[normalizedName]) {
			return cardImages[normalizedName];
		}

		return null;
	}

	// Extract headings for table of contents
	function extractHeadings(content) {
		const headings = [];
		if (!content) return headings;

		if (content.root && content.root.type === 'root') {
			extractLexicalHeadings(content.root, headings);
		} else if (Array.isArray(content)) {
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
			node.children.forEach((child) => extractLexicalHeadings(child, headings));
		}
	}

	function extractText(children) {
		if (!children) return '';
		return children.map((child) => child.text || '').join('');
	}

	function extractLexicalText(children) {
		if (!children) return '';
		return children.map((child) => child.text || extractLexicalText(child.children)).join('');
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

		const fullHtml = renderContent(content);
		const decklistPattern = /\[DECKLIST:(\d+)\]/g;
		const matches = [...fullHtml.matchAll(decklistPattern)];

		if (matches.length === 0) {
			return [{ type: 'html', content: fullHtml }];
		}

		const blocks = [];
		let lastIndex = 0;

		matches.forEach((match) => {
			const beforeMarker = fullHtml.substring(lastIndex, match.index);
			if (beforeMarker.trim()) {
				blocks.push({ type: 'html', content: beforeMarker });
			}

			const decklistIndex = parseInt(match[1]);
			if (decklists && decklists[decklistIndex]) {
				blocks.push({
					type: 'decklist',
					data: decklists[decklistIndex]
				});
			}

			lastIndex = match.index + match[0].length;
		});

		const afterLast = fullHtml.substring(lastIndex);
		if (afterLast.trim()) {
			blocks.push({ type: 'html', content: afterLast });
		}

		return blocks;
	}

	// Render rich text content as HTML
	function renderContent(content) {
		if (!content) return '';

		if (typeof content === 'string') {
			return content;
		}

		if (content.root && content.root.type === 'root') {
			return renderLexicalNode(content.root);
		}

		if (Array.isArray(content)) {
			return content.map((block) => renderBlock(block)).join('');
		}

		if (typeof content === 'object') {
			return JSON.stringify(content, null, 2);
		}

		return '';
	}

	// Render Lexical JSON to HTML (Payload v3 format)
	function renderLexicalNode(node) {
		if (!node) return '';

		// Handle line breaks (Shift+Enter in editor)
		if (node.type === 'linebreak') {
			return '<br />';
		}

		if (node.type === 'text') {
			let text = escapeHtml(node.text || '');

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

		if (node.type === 'paragraph') {
			const children = renderLexicalChildren(node.children);
			return `<p>${children}</p>`;
		}

		if (node.type === 'heading') {
			const tag = node.tag || 'h2';
			const children = renderLexicalChildren(node.children);
			const text = extractLexicalText(node.children);
			const id = slugify(text);
			return `<${tag} id="${id}">${children}</${tag}>`;
		}

		if (node.type === 'list') {
			const tag = node.listType === 'number' ? 'ol' : 'ul';
			const itemsHtml = (node.children || [])
				.map((item) => {
					if (item.type !== 'listitem') return renderLexicalNode(item);

					const children = item.children || [];
					const hasOnlyNestedList = children.length === 1 && children[0].type === 'list';

					if (hasOnlyNestedList) {
						return renderLexicalNode(children[0]);
					}

					const content = renderLexicalChildren(children);
					return `<li>${content}</li>`;
				})
				.join('');
			return `<${tag}>${itemsHtml}</${tag}>`;
		}

		if (node.type === 'listitem') {
			const children = renderLexicalChildren(node.children);
			return `<li>${children}</li>`;
		}

		if (node.type === 'quote') {
			const children = renderLexicalChildren(node.children);
			return `<blockquote>${children}</blockquote>`;
		}

		if (node.type === 'code') {
			const code = node.children?.map((c) => c.text || '').join('') || '';
			return `<pre><code>${escapeHtml(code)}</code></pre>`;
		}

		if (node.type === 'upload') {
			const media = node.value || node;
			const imageUrl = media.url || '';
			const altText = media.alt || media.filename || '';

			return `<figure class="my-8"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" class="rounded-lg" /></figure>`;
		}

		if (node.type === 'link' || node.type === 'autolink') {
			const children = renderLexicalChildren(node.children);

			let rawUrl = node.fields?.url || node.url || '#';

			try {
				rawUrl = decodeURIComponent(rawUrl);
			} catch (e) {}

			let cardMatch = rawUrl.match(/^card:(.+)$/);
			if (!cardMatch) {
				cardMatch = rawUrl.match(/^#card:(.+)$/);
			}

			if (cardMatch) {
				let fullString = cardMatch[1];

				let separatorIndex = -1;
				let separatorLength = 1;

				separatorIndex = fullString.indexOf('|');
				if (separatorIndex === -1) {
					separatorIndex = fullString.indexOf('%7C');
					if (separatorIndex !== -1) separatorLength = 3;
				}
				if (separatorIndex === -1) {
					separatorIndex = fullString.indexOf('::');
					if (separatorIndex !== -1) separatorLength = 2;
				}
				if (separatorIndex === -1) {
					separatorIndex = fullString.indexOf('--');
					if (separatorIndex !== -1) separatorLength = 2;
				}

				let cardId, customUrl;
				if (separatorIndex !== -1) {
					cardId = fullString.substring(0, separatorIndex);
					customUrl = fullString.substring(separatorIndex + separatorLength);
					try {
						customUrl = decodeURIComponent(customUrl);
					} catch (e) {}
				} else {
					cardId = fullString;
					customUrl = null;
				}

				let pitch = null;
				const pitchMatch = cardId.match(/\[(r|y|b)\]$/i);
				if (pitchMatch) {
					const pitchLetter = pitchMatch[1].toLowerCase();
					pitch = pitchLetter === 'r' ? '1' : pitchLetter === 'y' ? '2' : '3';
					cardId = cardId.replace(/\[(r|y|b)\]$/i, '').trim();
				}

				try {
					cardId = decodeURIComponent(cardId);
				} catch (e) {}

				const linkUrl =
					customUrl || `https://cards.fabtcg.com/results/?q=${encodeURIComponent(cardId)}`;
				const pitchAttr = pitch ? ` data-card-pitch="${pitch}"` : '';
				const customUrlAttr = customUrl ? ` data-card-url="${escapeHtml(customUrl)}"` : '';

				const pitchLetter = pitch === '1' ? 'r' : pitch === '2' ? 'y' : pitch === '3' ? 'b' : null;
				const cardImg = getCardImage(cardId, pitchLetter);
				const imageAttr = cardImg?.imageUrl
					? ` data-card-image="${escapeHtml(cardImg.imageUrl)}"`
					: '';
				const fallbackAttr = cardImg?.fallbackUrl
					? ` data-card-fallback="${escapeHtml(cardImg.fallbackUrl)}"`
					: '';

				return `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" data-card-name="${escapeHtml(cardId)}"${pitchAttr}${customUrlAttr}${imageAttr}${fallbackAttr} class="card-link !text-blue-400 hover:!text-blue-300">${children}</a>`;
			} else {
				const url = escapeHtml(rawUrl);
				return `<a href="${url}" target="_blank" rel="noopener noreferrer">${children}</a>`;
			}
		}

		if (node.children) {
			return renderLexicalChildren(node.children);
		}

		return '';
	}

	function renderLexicalChildren(children) {
		if (!children || !Array.isArray(children)) return '';
		return children.map((child) => renderLexicalNode(child)).join('');
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
				if (child.type === 'link') {
					let rawUrl = child.fields?.url || child.url || '#';
					try {
						rawUrl = decodeURIComponent(rawUrl);
					} catch (e) {}

					let cardMatch = rawUrl.match(/^card:(.+)$/);
					if (!cardMatch) {
						cardMatch = rawUrl.match(/^#card:(.+)$/);
					}

					if (cardMatch) {
						let fullString = cardMatch[1];

						let separatorIndex = -1;
						let separatorLength = 1;

						separatorIndex = fullString.indexOf('|');
						if (separatorIndex === -1) {
							separatorIndex = fullString.indexOf('%7C');
							if (separatorIndex !== -1) separatorLength = 3;
						}
						if (separatorIndex === -1) {
							separatorIndex = fullString.indexOf('::');
							if (separatorIndex !== -1) separatorLength = 2;
						}
						if (separatorIndex === -1) {
							separatorIndex = fullString.indexOf('--');
							if (separatorIndex !== -1) separatorLength = 2;
						}

						let cardId, customUrl;
						if (separatorIndex !== -1) {
							cardId = fullString.substring(0, separatorIndex);
							customUrl = fullString.substring(separatorIndex + separatorLength);
							try {
								customUrl = decodeURIComponent(customUrl);
							} catch (e) {}
						} else {
							cardId = fullString;
							customUrl = null;
						}

						let pitch = null;
						const pitchMatch = cardId.match(/\[(r|y|b)\]$/i);
						if (pitchMatch) {
							const pitchLetter = pitchMatch[1].toLowerCase();
							pitch = pitchLetter === 'r' ? '1' : pitchLetter === 'y' ? '2' : '3';
							cardId = cardId.replace(/\[(r|y|b)\]$/i, '').trim();
						}

						try {
							cardId = decodeURIComponent(cardId);
						} catch (e) {}

						const linkUrl =
							customUrl || `https://cards.fabtcg.com/results/?q=${encodeURIComponent(cardId)}`;
						const pitchAttr = pitch ? ` data-card-pitch="${pitch}"` : '';
						const customUrlAttr = customUrl ? ` data-card-url="${escapeHtml(customUrl)}"` : '';

						const pitchLetter2 =
							pitch === '1' ? 'r' : pitch === '2' ? 'y' : pitch === '3' ? 'b' : null;
						const cardImg2 = getCardImage(cardId, pitchLetter2);
						const imageAttr2 = cardImg2?.imageUrl
							? ` data-card-image="${escapeHtml(cardImg2.imageUrl)}"`
							: '';
						const fallbackAttr2 = cardImg2?.fallbackUrl
							? ` data-card-fallback="${escapeHtml(cardImg2.fallbackUrl)}"`
							: '';

						return `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" data-card-name="${escapeHtml(cardId)}"${pitchAttr}${customUrlAttr}${imageAttr2}${fallbackAttr2} class="card-link !text-blue-400 hover:!text-blue-300">${renderChildren(child.children)}</a>`;
					} else {
						return `<a href="${escapeHtml(rawUrl)}" target="_blank" rel="noopener noreferrer">${renderChildren(child.children)}</a>`;
					}
				}

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
	<title>Preview: {data.article.title} - AGE</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- Preview Banner - Fixed at top -->
<div
	class="fixed top-0 right-0 left-0 z-[100] border-b border-amber-600/50 bg-amber-500 text-black"
>
	<div class="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<svg
					class="h-5 w-5 flex-shrink-0"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
					/>
				</svg>
				<div class="flex items-center gap-2">
					<span class="font-bold">PREVIEW MODE</span>
					{#if data.article._status === 'draft'}
						<span class="rounded bg-black/20 px-2 py-0.5 text-xs font-medium">Draft</span>
					{/if}
				</div>
			</div>
			<span class="hidden text-sm opacity-75 sm:block"
				>This is how your article will appear when published</span
			>
		</div>
	</div>
</div>

<!-- Spacer for fixed preview banner -->
<div class="h-11"></div>

<div class="min-h-screen">
	<!-- Hero Section with Cover Image and Title Overlay -->
	<header class="relative px-4 pt-6 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<!-- Cover Image Container -->
			<div
				class="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-900 sm:rounded-2xl"
			>
				{#if data.article.coverImage?.src}
					<img
						src={data.article.coverImage.src}
						srcset={data.article.coverImage.srcset}
						sizes="(max-width: 1280px) 100vw, 1280px"
						alt={data.article.title}
						class="h-full w-full object-cover"
						loading="eager"
					/>
					<div
						class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
					></div>
				{:else}
					<div class="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"></div>
				{/if}

				<!-- Discreet Back Link -->
				<a
					href="/library"
					class="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white sm:top-4 sm:left-4 sm:text-sm"
				>
					<svg
						class="h-3.5 w-3.5 sm:h-4 sm:w-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
						/>
					</svg>
					All articles
				</a>

				<!-- Text Content Overlay -->
				<div class="absolute inset-0 flex items-end">
					<div class="w-full p-4 sm:p-6 lg:p-8">
						<!-- Tags & Premium Badge -->
						<div class="mb-3 flex flex-wrap items-center gap-2 sm:mb-4 sm:gap-3">
							{#if data.article.tags && data.article.tags.length > 0}
								<span
									class="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold tracking-wider text-blue-400 uppercase backdrop-blur-sm sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm"
								>
									{data.article.tags[0].name}
								</span>
							{/if}
							<span
								class="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm {data
									.article.accessMode === 'Premium'
									? 'bg-emerald-500/20 text-emerald-400'
									: 'bg-white/10 text-gray-200 sm:text-blue-400'}"
							>
								{#if data.article.accessMode === 'Premium'}
									<svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
										<path
											fill-rule="evenodd"
											d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
											clip-rule="evenodd"
										/>
									</svg>
									Premium
								{:else}
									Free
								{/if}
							</span>
						</div>

						<!-- Title -->
						<h1
							class="max-w-4xl text-2xl leading-tight font-bold tracking-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl lg:text-5xl"
						>
							{data.article.title}
						</h1>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Author Byline -->
	<div class="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
			{#if data.article.author}
				<div class="flex items-center gap-2">
					{#if data.article.author.profilePicture}
						<img
							src={data.article.author.profilePicture}
							alt={data.article.author.name}
							class="h-6 w-6 rounded-full object-cover"
						/>
					{/if}
					<span class="font-medium text-gray-300">{data.article.author.name}</span>
				</div>
				<span class="text-gray-600">·</span>
			{/if}
			{#if data.article.publishedAt}
				<time datetime={data.article.publishedAt}>
					{new Date(data.article.publishedAt).toLocaleDateString('en-US', {
						month: 'long',
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

	<!-- Main Content Area -->
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
		<div class="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8 xl:gap-12">
			<!-- Left Sidebar - Table of Contents -->
			<aside class="hidden lg:block">
				<div class="scrollbar-hide sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
					{#if tableOfContents.length > 0}
						<nav>
							<div class="space-y-1 pb-8">
								{#each tableOfContents as heading}
									<a
										href="#{heading.id}"
										class="block py-1 text-sm leading-normal transition-colors {activeSection ===
										heading.id
											? 'text-white'
											: 'text-gray-500 hover:text-gray-300'}"
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

			<!-- Main Content -->
			<article class="min-w-0">
				<div class="relative">
					<!-- Article content using Tailwind Typography -->
					<div
						class="mx-auto prose prose-lg max-w-[65ch] prose-invert lg:prose-xl
						prose-headings:scroll-mt-24
						prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white prose-h2:mt-16 prose-h2:mb-6
						prose-h2:text-[1.75rem] sm:prose-h2:text-[2rem] prose-h3:mt-12 prose-h3:mb-4
						prose-h3:text-[1.375rem] sm:prose-h3:text-[1.5rem] prose-h4:mt-10 prose-h4:mb-3
						prose-h4:text-[1.125rem] sm:prose-h4:text-[1.25rem] prose-p:text-[1.125rem] prose-p:leading-[1.8]
						prose-p:font-normal prose-p:tracking-[-0.01em] prose-p:text-gray-200 prose-a:text-blue-400
						prose-a:no-underline prose-blockquote:border-l-2
						prose-blockquote:border-gray-600 prose-blockquote:pl-6 prose-blockquote:text-gray-300 prose-blockquote:not-italic prose-strong:font-semibold
						prose-strong:text-white prose-em:text-gray-200
						prose-code:rounded
						prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:text-orange-400 prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl
						prose-pre:border prose-pre:border-white/10 prose-pre:bg-gray-900 prose-li:text-gray-200
						prose-li:marker:text-gray-500 prose-img:rounded-xl
						prose-hr:border-gray-800
						[&>:first-child]:mt-0"
					>
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
											{cardImages}
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

				<!-- Tags Footer -->
				{#if data.article.tags && data.article.tags.length > 1}
					<div class="mx-auto mt-8 max-w-prose border-t border-white/10 pt-6 sm:mt-12 sm:pt-8">
						<h3 class="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase sm:mb-4">
							Topics
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each data.article.tags as tag}
								<span
									class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-gray-300 sm:px-4 sm:py-1.5"
								>
									{tag.name}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Author Card Footer -->
				{#if data.article.author}
					<div class="mt-8 sm:mt-12">
						<div class="mb-4 flex items-center gap-3">
							<div
								class="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"
							></div>
							<span class="text-xs font-semibold tracking-wider text-gray-500 uppercase"
								>About the Author</span
							>
							<div
								class="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"
							></div>
						</div>

						<div
							class="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-800/40 p-5 sm:p-8"
						>
							<div
								class="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-blue-500/5 blur-2xl"
							></div>
							<div
								class="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-purple-500/5 blur-2xl"
							></div>

							<div class="relative">
								<div
									class="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left"
								>
									<div class="shrink-0">
										{#if data.article.author.profilePicture}
											<img
												src={data.article.author.profilePicture}
												alt={data.article.author.name}
												class="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/10 sm:h-24 sm:w-24"
											/>
										{:else}
											<div
												class="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white/10 sm:h-24 sm:w-24"
											>
												<span class="text-2xl font-bold text-white sm:text-3xl">
													{data.article.author.name.charAt(0).toUpperCase()}
												</span>
											</div>
										{/if}
									</div>

									<div class="mt-4 flex-1 sm:mt-0">
										<h3 class="text-xl font-bold text-white sm:text-2xl">
											{data.article.author.name}
										</h3>

										{#if data.article.author.bio}
											<div class="mt-2 text-sm leading-relaxed text-gray-400 sm:text-base">
												{@html renderContent(data.article.author.bio)}
											</div>
										{/if}

										<div
											class="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start"
										>
											{#if data.article.author.socialLinks && data.article.author.socialLinks.length > 0}
												{#each data.article.author.socialLinks as link}
													{@const iconConfig = getLinkIcon(link)}
													<a
														href={normalizeUrl(link.url)}
														target="_blank"
														rel="noopener noreferrer"
														class="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all duration-200 hover:scale-110 hover:border-white/20 hover:bg-white/10 {iconConfig.color}"
														title={getLinkLabel(link)}
														aria-label={getLinkLabel(link)}
													>
														<svg
															class="h-4 w-4"
															fill={iconConfig.fill ? 'currentColor' : 'none'}
															stroke={iconConfig.fill ? 'none' : 'currentColor'}
															stroke-width={iconConfig.fill ? '0' : '2'}
															viewBox="0 0 24 24"
														>
															<path d={iconConfig.icon} />
														</svg>
													</a>
												{/each}
											{/if}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</article>
		</div>
	</div>
</div>

<!-- Card hover tooltip for inline card links -->
<CardHover />
