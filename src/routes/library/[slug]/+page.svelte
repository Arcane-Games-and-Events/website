<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import Decklist from '$lib/components/Decklist.svelte';
	import CardHover from '$lib/components/CardHover.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import RenderLexical from '$lib/cms/render/RenderLexical.svelte';
	import LibraryVideoBlock from '$lib/cms/render/LibraryVideoBlock.svelte';

	export let data;

	// --- Engagement tracking state ---
	let engagementId = null;
	let engagementInterval = null;
	let activeTime = 0;
	let activeTimerRunning = false;
	let activeTimerInterval = null;
	let maxScrollDepth = 0;
	let shareClickedType = null;
	let premiumCtaViewed = false;
	let premiumCtaClicked = false;
	let decklistInteractionCount = 0;
	let cardHoverCount = 0;

	// Card images map from server for hover tooltips
	$: cardImages = data.cardImages || {};

	// ---- masthead labels (same vocabulary as the homepage cover) ----
	$: pubDate = data.article.publishedAt ? new Date(data.article.publishedAt) : null;
	$: pubLabel = pubDate
		? pubDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
		: '';
	$: isVideoEntry = !!data.article.video || !!data.article.videoLocked;
	$: rubric = data.article.tags?.[0]?.name || (isVideoEntry ? 'Video' : 'Article');
	$: rubricHref = data.article.tags?.[0]?.slug
		? `/library/tag/${data.article.tags[0].slug}`
		: '/library';
	$: rubricLabel = isVideoEntry && rubric !== 'Video' ? `${rubric} · Video` : rubric;
	$: hasCover = !isVideoEntry && !!data.article.coverImage?.src;
	$: videoPoster = data.article.thumbnailImage?.src || data.article.coverImage?.src || '';
	$: lengthLabel = data.article.readTime ? `${data.article.readTime} min read` : '';

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
		// If URL already has a protocol, return as-is
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}
		// Add https:// if it starts with www. or looks like a domain
		if (url.startsWith('www.') || url.includes('.')) {
			return `https://${url}`;
		}
		return url;
	}

	// Process content blocks for inline decklists
	let renderBlocks = [];
	let tableOfContents = [];

	/**
	 * Per-render heading-id counter. Articles can have two headings
	 * with identical text ("Round 1" / "Round 1"), and slugify() would
	 * collapse them to the same id — that crashes the keyed {#each}
	 * over `tableOfContents` (duplicate keys) and produces invalid
	 * duplicate-id attributes in the rendered HTML. We dedupe by
	 * appending an index ("round-1" / "round-1-1" / ...). This map is
	 * reset at the start of every renderBlocks pass so reactive
	 * re-renders don't accumulate counts across articles.
	 */
	let headingIdCounts = new Map();
	function nextHeadingId(base) {
		const safeBase = base || 'section';
		const n = headingIdCounts.get(safeBase) ?? 0;
		headingIdCounts.set(safeBase, n + 1);
		return n === 0 ? safeBase : `${safeBase}-${n}`;
	}
	// Map of heading.id → top-level (h2) number. Only h2 entries get a number;
	// sub-headings (h3+) get a small bullet instead so the hierarchy reads at
	// a glance in the TOC sidebar.
	$: topLevelNumbers = (() => {
		const map = {};
		let n = 0;
		for (const h of tableOfContents) {
			if (h.level === 2) {
				n += 1;
				map[h.id] = n;
			}
		}
		return map;
	})();
	let activeSection = '';
	let mobileTocOpen = false;
	let expandedSections = {}; // Track which sections are expanded

	// Check if a heading has children (next headings with higher level number)
	function hasChildren(index, toc = tableOfContents) {
		if (index >= toc.length - 1) return false;
		const currentLevel = toc[index].level;
		const nextLevel = toc[index + 1]?.level;
		return nextLevel > currentLevel;
	}

	$: {
		if (data.article.content) {
			renderBlocks = processInlineDecklists(data.article.content, data.article.decklists);
			tableOfContents = extractHeadings(data.article.content);
			// Initialize sections: only h2 sections are expanded by default (showing h3)
			// h3+ sections start collapsed (hiding h4+)
			const newExpanded = { ...expandedSections };
			tableOfContents.forEach((heading, index) => {
				if (hasChildren(index, tableOfContents) && newExpanded[heading.id] === undefined) {
					// Only expand h2 sections by default
					newExpanded[heading.id] = heading.level === 2;
				}
			});
			expandedSections = newExpanded;
		}
	}

	// Check if a heading should be visible based on parent expansion state
	function isVisible(index) {
		if (index === 0) return true;
		const heading = tableOfContents[index];
		if (heading.level === 2) return true; // Top-level always visible

		// Find parent heading (previous heading with lower level number)
		for (let i = index - 1; i >= 0; i--) {
			const parent = tableOfContents[i];
			if (parent.level < heading.level) {
				// Check if parent is expanded
				if (!expandedSections[parent.id]) return false;
				// Continue checking ancestors
				if (parent.level > 2) {
					return isVisible(i);
				}
				return true;
			}
		}
		return true;
	}

	// Toggle section expansion
	function toggleSection(id) {
		expandedSections = { ...expandedSections, [id]: !expandedSections[id] };
	}

	/**
	 * Look up card image from the server-provided cardImages map
	 */
	function getCardImage(cardName, pitch) {
		const normalizedName = cardName.toLowerCase();
		const pitchKey = pitch ? `${normalizedName}:${pitch}` : null;

		// Try pitch-specific key first
		if (pitchKey && cardImages[pitchKey]) {
			return cardImages[pitchKey];
		}

		// Fall back to base name
		if (cardImages[normalizedName]) {
			return cardImages[normalizedName];
		}

		return null;
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

		// Dedupe ids using the same counter algorithm renderLexicalNode
		// uses. Both walks are depth-first in the same order, so the
		// resulting ids match between the TOC and the rendered article
		// body — anchor links keep working even when two headings
		// share the same text.
		const counts = new Map();
		for (const h of headings) {
			const base = h.id || 'section';
			const n = counts.get(base) ?? 0;
			if (n > 0) h.id = `${base}-${n}`;
			counts.set(base, n + 1);
		}

		return headings;
	}

	function extractLexicalHeadings(node, headings) {
		if (!node) return;

		if (node.type === 'heading') {
			const text = extractLexicalText(node.children);
			const id = slugify(text);
			// Lexical headings can express level in several shapes depending
			// on Payload/Lexical version: `tag: 'h2'` (string), `tag: 2`
			// (number), `level: 2`, or even `format: 2`. Try each in turn
			// so the TOC reliably picks up h3+ entries.
			let level = null;
			const tag = node.tag;
			if (typeof tag === 'string') {
				const match = tag.match(/(\d+)/);
				if (match) level = parseInt(match[1], 10);
			} else if (typeof tag === 'number' && tag > 0) {
				level = tag;
			}
			if (!level && typeof node.level === 'number') level = node.level;
			if (!level && typeof node.format === 'number' && node.format >= 1 && node.format <= 6) {
				level = node.format;
			}
			headings.push({ text, id, level: level || 2 });
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
		shareClickedType = 'copy_link';
	}

	function shareTwitter() {
		const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(data.article.title)}`;
		window.open(url, '_blank', 'width=550,height=420');
		shareClickedType = 'twitter';
	}

	/**
	 * Process content blocks and replace [DECKLIST:n] markers with actual decklists
	 */
	function processInlineDecklists(content, decklists) {
		if (!content) {
			return [{ type: 'html', content: '' }];
		}

		// Reset the heading-id dedupe counter for this render pass so
		// the rendered HTML's `id` attributes line up with the TOC's
		// deduped ids (extractHeadings runs its own walk in the same
		// order and produces matching ids).
		headingIdCounts = new Map();

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

		matches.forEach((match) => {
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

		// Handle line breaks (Shift+Enter in editor)
		if (node.type === 'linebreak') {
			return '<br />';
		}

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
			const id = nextHeadingId(slugify(text));
			return `<${tag} id="${id}">${children}</${tag}>`;
		}

		// Handle lists
		if (node.type === 'list') {
			const tag = node.listType === 'number' ? 'ol' : 'ul';
			// Process list items, handling nested lists specially
			const itemsHtml = (node.children || [])
				.map((item) => {
					if (item.type !== 'listitem') return renderLexicalNode(item);

					const children = item.children || [];
					// Check if this listitem contains ONLY a nested list (no text content)
					// This happens in Lexical when you have nested lists - the nested list
					// is wrapped in its own listitem, causing an empty bullet
					const hasOnlyNestedList = children.length === 1 && children[0].type === 'list';

					if (hasOnlyNestedList) {
						// Don't wrap in <li>, just render the nested list directly
						// This prevents the empty bullet for the wrapper listitem
						return renderLexicalNode(children[0]);
					}

					// Normal listitem with content
					const content = renderLexicalChildren(children);
					return `<li>${content}</li>`;
				})
				.join('');
			return `<${tag}>${itemsHtml}</${tag}>`;
		}

		if (node.type === 'listitem') {
			// This handles listitems that appear outside the list context (shouldn't happen normally)
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
			const code = node.children?.map((c) => c.text || '').join('') || '';
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

			// Payload CMS Lexical stores URLs in node.fields.url for custom links
			let rawUrl = node.fields?.url || node.url || '#';

			// Try to decode the URL in case it was URL-encoded by the CMS
			try {
				rawUrl = decodeURIComponent(rawUrl);
			} catch (e) {
				// Keep original if decoding fails
			}

			// Check if this is a card link
			// Supports: card:CardName[pitch]|customUrl or #card:CardName[pitch]|customUrl
			let cardMatch = rawUrl.match(/^card:(.+)$/);
			if (!cardMatch) {
				cardMatch = rawUrl.match(/^#card:(.+)$/);
			}

			if (cardMatch) {
				let fullString = cardMatch[1];

				// Look for separator: | (pipe), %7C (encoded), :: or --
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
					} catch (e) {
						// Keep as-is
					}
				} else {
					cardId = fullString;
					customUrl = null;
				}

				// Extract pitch indicator [r], [y], [b] from card name
				let pitch = null;
				const pitchMatch = cardId.match(/\[(r|y|b)\]$/i);
				if (pitchMatch) {
					const pitchLetter = pitchMatch[1].toLowerCase();
					pitch = pitchLetter === 'r' ? '1' : pitchLetter === 'y' ? '2' : '3';
					cardId = cardId.replace(/\[(r|y|b)\]$/i, '').trim();
				}

				// Decode URL-encoded card names (e.g., Felling%20of%20the%20Crown -> Felling of the Crown)
				try {
					cardId = decodeURIComponent(cardId);
				} catch (e) {
					// Keep original if decoding fails
				}

				const linkUrl =
					customUrl || `https://cards.fabtcg.com/results/?q=${encodeURIComponent(cardId)}`;
				const pitchAttr = pitch ? ` data-card-pitch="${pitch}"` : '';
				const customUrlAttr = customUrl ? ` data-card-url="${escapeHtml(customUrl)}"` : '';

				// Look up card image from server-resolved images
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

		// Handle root and other container nodes
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
				// Handle links
				if (child.type === 'link') {
					// Get URL and decode if needed
					let rawUrl = child.fields?.url || child.url || '#';
					try {
						rawUrl = decodeURIComponent(rawUrl);
					} catch (e) {
						// Keep original
					}

					// Check for card link patterns
					let cardMatch = rawUrl.match(/^card:(.+)$/);
					if (!cardMatch) {
						cardMatch = rawUrl.match(/^#card:(.+)$/);
					}

					if (cardMatch) {
						let fullString = cardMatch[1];

						// Look for separator - try multiple options
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

						// Extract pitch indicator [r], [y], [b] from card name
						let pitch = null;
						const pitchMatch = cardId.match(/\[(r|y|b)\]$/i);
						if (pitchMatch) {
							const pitchLetter = pitchMatch[1].toLowerCase();
							pitch = pitchLetter === 'r' ? '1' : pitchLetter === 'y' ? '2' : '3';
							cardId = cardId.replace(/\[(r|y|b)\]$/i, '').trim();
						}

						// Decode URL-encoded card names (e.g., Felling%20of%20the%20Crown -> Felling of the Crown)
						try {
							cardId = decodeURIComponent(cardId);
						} catch (e) {
							// Keep original if decoding fails
						}

						const linkUrl =
							customUrl || `https://cards.fabtcg.com/results/?q=${encodeURIComponent(cardId)}`;
						const pitchAttr = pitch ? ` data-card-pitch="${pitch}"` : '';
						const customUrlAttr = customUrl ? ` data-card-url="${escapeHtml(customUrl)}"` : '';

						// Look up card image from server-resolved images
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

	// --- Engagement tracking ---
	function getEngagementPayload() {
		const readTime = data.article.readTime || 5;
		const estimatedReadSeconds = readTime * 60;
		return {
			action: 'engagement_update',
			engagementId,
			pageViewId: data.pageViewId || null,
			articleSlug: data.article.slug,
			timeOnPageSeconds: Math.round(activeTime),
			maxScrollDepth,
			readCompleted: maxScrollDepth >= 90 && activeTime >= estimatedReadSeconds * 0.5,
			contentEngaged: activeTime > 30 && maxScrollDepth > 50,
			shareClicked: shareClickedType,
			premiumCtaViewed,
			premiumCtaClicked,
			decklistInteractions: decklistInteractionCount,
			cardHovers: cardHoverCount
		};
	}

	async function sendEngagement() {
		try {
			const payload = getEngagementPayload();
			const res = await fetch('/api/analytics/event', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const result = await res.json();
			if (result.engagementId && !engagementId) {
				engagementId = result.engagementId;
			}
		} catch {
			// Silent fail
		}
	}

	function sendBeaconEngagement() {
		try {
			const payload = getEngagementPayload();
			navigator.sendBeacon('/api/analytics/event', JSON.stringify(payload));
		} catch {
			// Silent fail
		}
	}

	onMount(() => {
		// --- Active time tracking (pauses when tab is hidden) ---
		activeTimerRunning = true;
		activeTimerInterval = setInterval(() => {
			if (activeTimerRunning) activeTime += 1;
		}, 1000);

		function handleVisibility() {
			activeTimerRunning = !document.hidden;
		}
		document.addEventListener('visibilitychange', handleVisibility);

		// --- Scroll depth tracking ---
		function handleScrollDepth() {
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			if (docHeight > 0) {
				const scrolled = Math.round((window.scrollY / docHeight) * 100);
				if (scrolled > maxScrollDepth) maxScrollDepth = scrolled;
			}
		}
		window.addEventListener('scroll', handleScrollDepth, { passive: true });

		// --- Premium CTA tracking (IntersectionObserver) ---
		let ctaObserver = null;
		const ctaEl = document.querySelector('[data-premium-cta]');
		if (ctaEl) {
			ctaObserver = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						premiumCtaViewed = true;
					}
				},
				{ threshold: 0.5 }
			);
			ctaObserver.observe(ctaEl);
		}

		// --- Decklist & card hover tracking (event delegation) ---
		function handleDecklistClick(e) {
			if (e.target.closest('[data-decklist-toggle]')) {
				decklistInteractionCount += 1;
			}
		}
		function handleCardHover(e) {
			if (e.target.closest('[data-card-hover]')) {
				cardHoverCount += 1;
			}
		}
		document.addEventListener('click', handleDecklistClick);
		document.addEventListener('mouseenter', handleCardHover, true);

		// --- Periodic engagement updates (every 30s) ---
		engagementInterval = setInterval(sendEngagement, 30000);

		// --- Send final state on page unload ---
		function handleBeforeUnload() {
			sendBeaconEngagement();
		}
		window.addEventListener('beforeunload', handleBeforeUnload);

		// --- Cleanup ---
		return () => {
			document.removeEventListener('visibilitychange', handleVisibility);
			window.removeEventListener('scroll', handleScrollDepth);
			document.removeEventListener('click', handleDecklistClick);
			document.removeEventListener('mouseenter', handleCardHover, true);
			window.removeEventListener('beforeunload', handleBeforeUnload);
			if (ctaObserver) ctaObserver.disconnect();
			clearInterval(activeTimerInterval);
			clearInterval(engagementInterval);
		};
	});

	onDestroy(() => {
		// Send final engagement when navigating away within SPA
		if (typeof window !== 'undefined') {
			sendBeaconEngagement();
		}
	});
</script>

<svelte:head>
	<title>{data.article.title} — AGE</title>
	{#if data.article.excerpt}
		<meta name="description" content={data.article.excerpt} />
	{/if}
</svelte:head>

<AgeShell>
	{#if !hasCover}
		<!-- back to the library -->
		<div class="mx-auto w-full max-w-[1680px] px-5 pt-4 md:px-8 md:pt-5">
			<a
				href="/library"
				class="inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[color,gap] hover:gap-3 hover:text-warm"
			>
				<span aria-hidden="true">←</span>
				Library
			</a>
		</div>
	{/if}

	<!-- ============ COVER ============
	     Same composition as the homepage latest release: the 16:9 cover sits
	     in a plate frame with the copy overlaid on its lower third at md+
	     (white on an ink scrim) and set beneath it on phones. Video
	     entries and entries without a cover use the paper variant with
	     the copy centred above the media. -->
	<section class="relative">
		{#if hasCover}
			<div class="relative mx-auto aspect-video w-full max-w-[1680px] overflow-hidden bg-ink">
				<img
					src={data.article.coverImage.src}
					srcset={data.article.coverImage.srcset}
					sizes="(min-width: 1680px) 1680px, 100vw"
					alt={data.article.title}
					loading="eager"
					fetchpriority="high"
					class="fp-kenburns absolute inset-0 h-full w-full object-cover"
				/>
				<div
					class="absolute inset-x-0 top-0 h-24"
					style="background: linear-gradient(180deg, rgba(23,21,15,0.35), rgba(23,21,15,0));"
					aria-hidden="true"
				></div>
				<div
					class="absolute inset-x-0 bottom-0 hidden h-[78%] md:block"
					style="background: linear-gradient(180deg, rgba(23,21,15,0) 0%, rgba(23,21,15,0.3) 22%, rgba(23,21,15,0.72) 45%, rgba(23,21,15,0.92) 68%, rgba(23,21,15,0.98) 100%);"
					aria-hidden="true"
				></div>
				<div
					class="fp-fade pointer-events-none absolute inset-3 border border-white/70 md:inset-7"
					style="animation-delay: 400ms;"
					aria-hidden="true"
				></div>
				<a
					href="/library"
					class="fp-fade absolute top-6 left-6 z-[2] inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.18em] text-white uppercase transition-[gap] hover:gap-3 md:top-10 md:left-10"
					style="animation-delay: 600ms; text-shadow: 0 1px 2px rgba(23,21,15,0.6);"
				>
					<span aria-hidden="true">←</span>
					Library
				</a>
			</div>
		{/if}

		<div
			class="fp-rise mx-auto w-full max-w-[960px] px-5 pt-7 pb-4 text-center md:px-8 {hasCover
				? 'md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:left-1/2 md:z-[1] md:-translate-x-1/2 md:pb-14 lg:pb-16'
				: 'md:pt-12 md:pb-6'}"
			style={hasCover
				? 'text-shadow: 0 1px 2px rgba(23,21,15,0.6), 0 6px 24px rgba(23,21,15,0.45);'
				: ''}
		>
			<a
				href={rubricHref}
				class="pointer-events-auto inline-flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.24em] uppercase md:text-[11.5px] {hasCover
					? 'text-warm md:text-white/90'
					: 'text-warm'}"
			>
				<span class="text-warm" aria-hidden="true">◆</span>
				{rubricLabel}
				<span class="text-warm" aria-hidden="true">◆</span>
			</a>
			<h1
				class="mt-2 font-newsreader text-[38px] leading-[1.0] font-semibold tracking-[-0.02em] [text-wrap:balance] md:mt-3 md:text-[clamp(46px,5.6vw,84px)] md:leading-[0.96] {hasCover
					? 'md:text-white'
					: ''}"
			>
				{data.article.title}
			</h1>
			{#if data.article.excerpt}
				<p
					class="mx-auto mt-2.5 max-w-[640px] text-center font-newsreader text-[17px] leading-[1.45] [text-wrap:balance] italic md:mt-3 md:text-[21px] {hasCover
						? 'text-soft md:text-white/85'
						: 'text-soft'}"
				>
					{data.article.excerpt}
				</p>
			{/if}
			<div
				class="mt-3.5 flex flex-wrap items-baseline justify-center gap-x-2 text-[11px] md:mt-4 {hasCover
					? 'text-fade md:text-white/60'
					: 'text-fade'}"
			>
				{#if data.article.author}
					<a
						href="/library/author/{data.article.author.slug}"
						class="pointer-events-auto font-extrabold tracking-[0.12em] uppercase hover:text-warm {hasCover
							? 'text-ink md:text-white/90'
							: 'text-ink'}"
					>
						By {data.article.author.name}
					</a>
					<span aria-hidden="true">·</span>
				{/if}
				{#if pubLabel || lengthLabel}
					<span class="font-semibold">{[pubLabel, lengthLabel].filter(Boolean).join(' · ')}</span>
				{/if}
				{#if data.isPremium}
					<span aria-hidden="true">·</span>
					<span class="font-extrabold tracking-[0.12em] text-prem uppercase">Premium</span>
				{/if}
			</div>
		</div>
	</section>

	{#if data.article.videoLocked}
		<!-- Premium video, non-member: paywalled frame, no player -->
		<figure class="m-0 mx-auto w-full max-w-[1200px] px-5 pt-4 md:px-8 md:pt-6">
			<div class="fp-plate relative overflow-hidden bg-[#080b15] md:aspect-video" data-premium-cta>
				{#if videoPoster}
					<img
						src={videoPoster}
						alt=""
						class="absolute inset-0 h-full w-full scale-105 object-cover blur-lg brightness-[0.4]"
					/>
				{/if}
				<div
					class="relative flex items-center justify-center px-5 py-8 md:absolute md:inset-0 md:px-6 md:py-0"
				>
					<div
						class="max-w-[560px] border-[3px] border-double border-paper-bg/80 px-6 py-8 text-center md:px-10 md:py-10"
					>
						<span
							class="mb-3 flex items-center justify-center gap-3 text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase"
						>
							<span aria-hidden="true">◆</span>Premium · Members only<span aria-hidden="true"
								>◆</span
							>
						</span>
						<h3
							class="m-0 mb-3 font-newsreader text-[clamp(28px,4vw,42px)] leading-[1] font-semibold tracking-[-0.02em] text-white"
						>
							Watch this video with a membership.
						</h3>
						<p
							class="mx-auto mb-6 max-w-[440px] font-newsreader text-[16px] leading-[1.5] italic"
							style="color: rgba(255,255,255,0.82);"
						>
							This video is for AGE Premium members. Membership unlocks every video, bonus match,
							and article on AGE.
						</p>
						<div class="flex flex-wrap items-center justify-center gap-3">
							<a
								href="/premium"
								onclick={() => {
									premiumCtaClicked = true;
								}}
								class="inline-flex items-center border border-prem bg-prem px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
							>
								Become a member
							</a>
							{#if !data.user}
								<a
									href="/login?redirect=/library/{data.article.slug}"
									class="inline-flex items-center border border-white/60 px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-colors hover:bg-white/10"
								>
									Sign in
								</a>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</figure>
	{:else if data.article.video}
		<figure class="m-0 mx-auto w-full max-w-[1200px] px-5 pt-4 md:px-8 md:pt-6">
			<div class="fp-plate">
				<LibraryVideoBlock video={data.article.video} poster={videoPoster} />
			</div>
		</figure>
	{/if}

	<!-- ============ READING LAYOUT ============ -->
	<div
		class="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-[72px] px-5 pt-[40px] pb-[30px] md:px-14 md:pt-[56px] lg:grid-cols-[232px_minmax(0,1fr)]"
	>
		<!-- ============ RAIL ============ -->
		<aside class="hidden lg:block">
			<div class="sticky top-[24px] max-h-[calc(100vh-48px)] overflow-y-auto pr-1">
				{#if data.article.author}
					<div class="border border-line bg-paper p-5 md:p-6">
						<div class="flex items-center gap-3">
							<span class="h-px flex-1 bg-ink"></span>
							<span
								class="font-newsreader text-[12px] font-semibold tracking-[0.22em] whitespace-nowrap uppercase"
								>The author</span
							>
							<span class="h-px flex-1 bg-ink"></span>
						</div>
						<div class="mt-1.5 flex justify-center" aria-hidden="true">
							<span class="h-[3px] w-8 bg-warm"></span>
						</div>
						<a
							href="/library/author/{data.article.author.slug}"
							class="group mt-5 flex flex-col items-center text-center"
						>
							{#if data.article.author.profilePicture}
								<span
									class="fp-plate block h-[72px] w-[72px] bg-panel bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
									style="background-image: url('{data.article.author.profilePicture}');"
								></span>
							{:else}
								<span
									class="fp-plate flex h-[72px] w-[72px] items-center justify-center bg-ink font-newsreader text-[34px] leading-none font-semibold text-paper-bg"
								>
									{data.article.author.name.charAt(0).toUpperCase()}
								</span>
							{/if}
							<span
								class="mt-4 block font-newsreader text-[22px] leading-[1.1] font-semibold tracking-[-0.01em] transition-colors group-hover:text-warm"
							>
								{data.article.author.name}
							</span>
							{#if data.article.author.role}
								<span class="mt-1 block font-newsreader text-[14px] text-soft italic"
									>{data.article.author.role}</span
								>
							{/if}
						</a>
						{#if data.article.author.bio}
							<div
								class="mt-4 border-t border-line pt-4 text-center font-newsreader text-[14px] leading-[1.55] text-soft"
							>
								{@html renderContent(data.article.author.bio)}
							</div>
						{/if}
						<div class="mt-4 flex flex-col divide-y border-t border-line">
							{#if data.article.author.socialLinks && data.article.author.socialLinks.length > 0}
								{#each data.article.author.socialLinks.slice(0, 3) as link (link.url)}
									<a
										href={normalizeUrl(link.url)}
										target="_blank"
										rel="noopener noreferrer"
										class="group/l flex items-center justify-between divide-line py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase transition-colors hover:text-warm"
									>
										{getLinkLabel(link)}
										<span
											class="opacity-40 transition-[opacity,transform] group-hover/l:translate-x-0.5 group-hover/l:opacity-100"
											aria-hidden="true">→</span
										>
									</a>
								{/each}
							{/if}
							<a
								href="/library/author/{data.article.author.slug}"
								class="group/l flex items-center justify-between py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
							>
								All articles
								<span class="transition-transform group-hover/l:translate-x-0.5" aria-hidden="true"
									>→</span
								>
							</a>
						</div>
					</div>
				{/if}

				{#if !data.isPreview && tableOfContents.length > 0}
					<nav class="mt-5 border-t border-line pt-[15px]">
						<div
							class="mb-[10px] flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-ink uppercase"
						>
							<span class="text-[8px] text-warm" aria-hidden="true">◆</span>
							Contents
						</div>
						{#key expandedSections}
							{#each tableOfContents as heading, index (heading.id)}
								{#if isVisible(index)}
									{@const _isTop = heading.level === 2}
									{@const _isActive = activeSection === heading.id}
									{#if _isTop}
										<!--
											Top-level: serif, large, ink, numbered.
											The dominant element in the TOC.
										-->
										<a
											href="#{heading.id}"
											class="flex items-baseline gap-[11px] pt-[12px] pb-[6px] font-newsreader text-[18px] leading-[1.2] font-semibold tracking-[-0.01em] transition-colors {_isActive
												? 'text-warm'
												: 'text-ink hover:text-warm'}"
										>
											<span
												class="font-mono-system text-[10px] font-bold {_isActive
													? 'text-warm'
													: 'text-fade'}"
											>
												{String(topLevelNumbers[heading.id] || '').padStart(2, '0')}
											</span>
											<span>{heading.text}</span>
										</a>
									{:else}
										<!--
											Sub-heading: mirror the parent h2's
											flex structure but with an *invisible*
											mono number placeholder. That spacer
											consumes the same width as `01`/`02`
											plus the gap, so the sub-text aligns
											pixel-perfectly with the parent's
											title text — no width guessing.
											Deeper levels step in by 16px on top.
										-->
										<a
											href="#{heading.id}"
											style="padding-left: {(heading.level - 3) * 16}px"
											class="flex items-baseline gap-[11px] py-[4px] text-[12.5px] leading-[1.4] font-medium transition-colors {_isActive
												? 'text-warm'
												: 'text-soft hover:text-warm'}"
										>
											<span
												class="invisible font-mono-system text-[10px] font-bold"
												aria-hidden="true"
											>
												00
											</span>
											<span>{heading.text}</span>
										</a>
									{/if}
								{/if}
							{/each}
						{/key}
					</nav>
				{/if}

				<!-- share -->
				<div class="mt-[18px] flex gap-2">
					<button
						type="button"
						onclick={copyLink}
						title="Copy link"
						aria-label="Copy link"
						class="flex h-8 w-8 cursor-pointer items-center justify-center border border-line2 bg-transparent text-[10.5px] font-extrabold text-soft transition-colors hover:border-accent hover:text-accent"
					>
						⧉
					</button>
					<button
						type="button"
						onclick={shareTwitter}
						title="Share on X"
						aria-label="Share on X"
						class="flex h-8 w-8 cursor-pointer items-center justify-center border border-line2 bg-transparent text-[10.5px] font-extrabold text-soft transition-colors hover:border-accent hover:text-accent"
					>
						X
					</button>
				</div>
			</div>
		</aside>

		<!-- ============ BODY ============ -->
		<article class="min-w-0">
			<div class="relative">
				<!--
					Editorial reading column. The Lexical renderer emits
					semantic HTML (p, h2/h3, blockquote, a, ul/ol, img, code);
					the prose-* utilities below recolor those tags to the
					editorial tokens — Newsreader serif body, rust accents
					on h2 + blockquote rule, accent links.
				-->
				<div
					class="{data.isPreview
						? 'pointer-events-none blur-[7px] select-none'
						: ''} prose max-w-[760px]
						prose-headings:scroll-mt-24 prose-headings:font-newsreader prose-headings:tracking-[-0.02em]
						prose-h2:mt-[56px] prose-h2:mb-[18px]
						prose-h2:text-[38px] prose-h2:font-semibold prose-h2:text-warm
						prose-h3:mt-10 prose-h3:mb-3 prose-h3:text-[24px] prose-h3:font-semibold
						prose-p:my-0 prose-p:mb-[24px]
						prose-p:font-newsreader prose-p:text-[21px]
						prose-p:leading-[1.7] prose-p:text-ink
						prose-a:text-accent prose-a:underline
						prose-a:decoration-[1px]
						prose-a:underline-offset-[3px] prose-blockquote:my-9 prose-blockquote:border-l-[3px] prose-blockquote:border-warm
						prose-blockquote:pl-7 prose-blockquote:not-italic
						prose-strong:font-semibold prose-strong:text-ink
						prose-em:italic
						prose-code:rounded-none prose-code:bg-panel
						prose-code:px-[5px] prose-code:py-[2px]
						prose-code:font-mono prose-code:text-[14px]
						prose-code:text-warm
						prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-none prose-pre:border
						prose-pre:border-line2 prose-pre:bg-paper prose-li:font-newsreader prose-li:text-[21px] prose-li:leading-[1.7]
						prose-li:text-ink prose-img:rounded-none
						prose-img:border prose-img:border-line2
						prose-hr:border-line2 [&_blockquote_p]:font-newsreader [&_blockquote_p]:text-[26px] [&_blockquote_p]:leading-[1.32]
						[&_blockquote_p]:font-medium [&_blockquote_p]:tracking-[-0.01em] [&_blockquote_p]:text-ink
						[&_blockquote_p]:italic
						[&_p:first-of-type]:first-letter:float-left
						[&_p:first-of-type]:first-letter:mt-[10px] [&_p:first-of-type]:first-letter:mr-3 [&_p:first-of-type]:first-letter:font-newsreader [&_p:first-of-type]:first-letter:text-[76px] [&_p:first-of-type]:first-letter:leading-[0.7] [&_p:first-of-type]:first-letter:font-semibold [&_p:first-of-type]:first-letter:text-warm [&>:first-child]:mt-0
					"
				>
					{#if data.article.content}
						{#if data.article.source === 'cms'}
							<!-- CMS entries render via the shared Lexical renderer so
							     widget nodes (decklist / stats_table / inline_video)
							     and inline card links round-trip through the same
							     pipeline the editor uses. -->
							<RenderLexical content={data.article.content} {cardImages} />
						{:else if renderBlocks.length > 0}
							{#each renderBlocks as block, i (i)}
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
					{:else if !data.article.video}
						<p class="text-soft">No content available.</p>
					{/if}
				</div>

				<!-- preview veil: the single blurred paragraph is decorative; this
				     sits over it so it can't be selected or inspected casually -->
				{#if data.isPreview}
					<div class="absolute inset-0" aria-hidden="true"></div>
				{/if}
			</div>

			<!-- ============ PREMIUM GATE ============ -->
			{#if data.isPreview}
				<div class="relative z-10 -mt-16 md:-mt-20" data-premium-cta>
					<div
						class="border-[3px] border-double border-ink bg-paper px-6 py-9 text-center md:px-12 md:py-12"
					>
						<div
							class="flex items-center justify-center gap-3 text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase"
						>
							<span aria-hidden="true">◆</span>
							Premium · Members only
							<span aria-hidden="true">◆</span>
						</div>
						<h3
							class="mx-auto mt-3 max-w-[640px] font-newsreader text-[30px] leading-[1.05] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[40px]"
						>
							Keep reading with a membership.
						</h3>
						<p
							class="mx-auto mt-4 max-w-[520px] font-newsreader text-[16px] leading-[1.5] text-soft italic md:text-[18px]"
						>
							This story is for AGE Premium members. Membership funds every article, broadcast,
							course, and event we put on — and unlocks all of it.
						</p>
						<div
							class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 md:mt-8"
						>
							<a
								href="/premium"
								onclick={() => {
									premiumCtaClicked = true;
								}}
								class="inline-flex items-center border border-prem bg-prem px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
							>
								Become a member
							</a>
							{#if !data.user}
								<a
									href="/login?redirect=/library/{data.article.slug}"
									class="inline-flex items-center border border-ink px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg"
								>
									Sign in
								</a>
							{/if}
						</div>
						<div class="mt-4 text-[11px] text-fade italic">$10 a month · cancel anytime</div>
					</div>
				</div>
			{/if}

			<!-- ============ TOPICS ============ -->
			{#if !data.isPreview && data.article.tags && data.article.tags.length > 0}
				<div class="mt-[44px] flex flex-wrap items-center gap-3">
					<span
						class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-ink uppercase"
					>
						<span class="text-[8px] text-warm" aria-hidden="true">◆</span>
						Filed under
					</span>
					{#each data.article.tags as tag (tag.slug)}
						<a
							href="/library/tag/{tag.slug}"
							class="border border-line2 px-[12px] py-[6px] text-[10.5px] font-extrabold tracking-[0.12em] text-soft uppercase transition-colors hover:border-warm hover:text-warm"
						>
							{tag.name}
						</a>
					{/each}
				</div>
			{/if}

			<!-- author card for phones/tablets (the rail above is lg-only) -->
			{#if data.article.author}
				<div class="mt-10 border border-line bg-paper p-5 md:p-6 lg:hidden">
					<div class="flex items-center gap-3">
						<span class="h-px flex-1 bg-ink"></span>
						<span
							class="font-newsreader text-[12px] font-semibold tracking-[0.22em] whitespace-nowrap uppercase"
							>The author</span
						>
						<span class="h-px flex-1 bg-ink"></span>
					</div>
					<div class="mt-1.5 flex justify-center" aria-hidden="true">
						<span class="h-[3px] w-8 bg-warm"></span>
					</div>
					<a
						href="/library/author/{data.article.author.slug}"
						class="group mt-5 flex flex-col items-center text-center"
					>
						{#if data.article.author.profilePicture}
							<span
								class="fp-plate block h-[84px] w-[84px] bg-panel bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
								style="background-image: url('{data.article.author.profilePicture}');"
							></span>
						{:else}
							<span
								class="fp-plate flex h-[84px] w-[84px] items-center justify-center bg-ink font-newsreader text-[34px] leading-none font-semibold text-paper-bg"
							>
								{data.article.author.name.charAt(0).toUpperCase()}
							</span>
						{/if}
						<span
							class="mt-4 block font-newsreader text-[22px] leading-[1.1] font-semibold tracking-[-0.01em] transition-colors group-hover:text-warm"
						>
							{data.article.author.name}
						</span>
						{#if data.article.author.role}
							<span class="mt-1 block font-newsreader text-[14px] text-soft italic"
								>{data.article.author.role}</span
							>
						{/if}
					</a>
					{#if data.article.author.bio}
						<div
							class="mt-4 border-t border-line pt-4 text-center font-newsreader text-[14px] leading-[1.55] text-soft"
						>
							{@html renderContent(data.article.author.bio)}
						</div>
					{/if}
					<div class="mt-4 flex flex-col divide-y border-t border-line">
						{#if data.article.author.socialLinks && data.article.author.socialLinks.length > 0}
							{#each data.article.author.socialLinks.slice(0, 3) as link (link.url)}
								<a
									href={normalizeUrl(link.url)}
									target="_blank"
									rel="noopener noreferrer"
									class="group/l flex items-center justify-between divide-line py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase transition-colors hover:text-warm"
								>
									{getLinkLabel(link)}
									<span
										class="opacity-40 transition-[opacity,transform] group-hover/l:translate-x-0.5 group-hover/l:opacity-100"
										aria-hidden="true">→</span
									>
								</a>
							{/each}
						{/if}
						<a
							href="/library/author/{data.article.author.slug}"
							class="group/l flex items-center justify-between py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
						>
							All articles
							<span class="transition-transform group-hover/l:translate-x-0.5" aria-hidden="true"
								>→</span
							>
						</a>
					</div>
				</div>
			{/if}
		</article>
	</div>
</AgeShell>

<!-- ============ MOBILE TOC FAB ============ -->
{#if !data.isPreview && tableOfContents.length > 0}
	<button
		type="button"
		onclick={() => (mobileTocOpen = true)}
		class="fixed right-4 bottom-6 z-40 flex cursor-pointer items-center gap-2 border-none bg-ink px-4 py-[10px] text-[11px] font-extrabold tracking-[0.07em] text-paper-bg uppercase shadow-[0_18px_36px_-22px_rgba(20,16,8,0.6)] hover:brightness-110 lg:hidden"
		aria-label="Table of contents"
	>
		<svg
			class="h-3.5 w-3.5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
		</svg>
		Contents
	</button>
{/if}

<!-- ============ MOBILE TOC MODAL ============ -->
{#if mobileTocOpen}
	<div class="fixed inset-0 z-50 lg:hidden">
		<div
			transition:fade={{ duration: 200 }}
			class="absolute inset-0 bg-black/60"
			onclick={() => (mobileTocOpen = false)}
			onkeydown={(e) => e.key === 'Escape' && (mobileTocOpen = false)}
			role="button"
			tabindex="0"
			aria-label="Close table of contents"
		></div>

		<div
			transition:fly={{ y: 300, duration: 300 }}
			class="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden border-t-[1.5px] border-ink bg-paper-bg shadow-[0_-18px_36px_-22px_rgba(20,16,8,0.5)]"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between border-b border-line2 bg-paper-bg px-5 py-4"
			>
				<div>
					<h3 class="font-newsreader text-[18px] font-semibold">Table of Contents</h3>
					<p class="text-[11px] font-semibold tracking-[0.04em] text-fade uppercase">
						{tableOfContents.length} sections
					</p>
				</div>
				<button
					type="button"
					onclick={() => (mobileTocOpen = false)}
					class="flex h-8 w-8 cursor-pointer items-center justify-center border border-line2 bg-transparent text-soft hover:border-ink"
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<nav class="overflow-y-auto px-3 py-3" style="max-height: calc(80vh - 90px);">
				{#key expandedSections}
					{#each tableOfContents as heading, index (heading.id)}
						{#if isVisible(index)}
							{@const _isTop = heading.level === 2}
							{@const _isActive = activeSection === heading.id}
							{#if _isTop}
								<a
									href="#{heading.id}"
									onclick={() => (mobileTocOpen = false)}
									class="flex items-baseline gap-3 pt-[14px] pb-[8px] font-newsreader text-[22px] leading-[1.2] font-semibold tracking-[-0.01em] transition-colors {_isActive
										? 'text-warm'
										: 'text-ink hover:text-warm'}"
								>
									<span
										class="font-mono-system text-[11px] font-bold {_isActive
											? 'text-warm'
											: 'text-fade'}"
									>
										{String(topLevelNumbers[heading.id] || '').padStart(2, '0')}
									</span>
									<span>{heading.text}</span>
								</a>
							{:else}
								<a
									href="#{heading.id}"
									onclick={() => (mobileTocOpen = false)}
									style="padding-left: {(heading.level - 3) * 18}px"
									class="flex items-baseline gap-3 py-[6px] text-[14px] leading-[1.4] font-medium transition-colors {_isActive
										? 'text-warm'
										: 'text-soft hover:text-warm'}"
								>
									<span class="invisible font-mono-system text-[11px] font-bold" aria-hidden="true">
										00
									</span>
									<span>{heading.text}</span>
								</a>
							{/if}
						{/if}
					{/each}
				{/key}
			</nav>
		</div>
	</div>
{/if}

<!-- card hover tooltip for inline card links -->
<CardHover />
