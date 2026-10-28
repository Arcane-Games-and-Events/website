<script>
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import AuthorCard from '$lib/components/age/library/AuthorCard.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { createContentTracker } from '$lib/analytics/contentTracker.js';
	import { fitTitle } from '$lib/actions/fitTitle.js';
	import { fade, fly } from 'svelte/transition';
	import CardHover from '$lib/components/CardHover.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import RenderLexical from '$lib/desk/render/RenderLexical.svelte';
	import { ARTICLE_PROSE } from '$lib/desk/render/articleProse.js';
	import LibraryVideoBlock from '$lib/desk/render/LibraryVideoBlock.svelte';

	export let data;

	// --- Content analytics: one view per piece, restarted when the reader
	// moves straight from one article to another (same component). ---
	/** @type {{ stop: (next?: string) => void } | null} */
	let tracker = null;
	let trackedId = null;
	afterNavigate(({ to }) => {
		const id = data.article?.id;
		if (!id || id === trackedId) return;
		tracker?.stop(to?.url?.pathname);
		trackedId = id;
		tracker = createContentTracker({
			entryId: id,
			gated: !!data.isPreview,
			readTimeMinutes: data.article.readTime,
			getBody: () => document.querySelector('[data-article-body]')
		});
	});
	onDestroy(() => tracker?.stop());

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
	$: authorBioHtml = data.article.author?.bio ? renderContent(data.article.author.bio) : '';
	$: authorLinks = (data.article.author?.socialLinks || [])
		.slice(0, 3)
		.map((link) => ({ label: getLinkLabel(link), href: normalizeUrl(link.url) }));

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

	let tableOfContents = [];

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

	// Extract headings for table of contents
	function extractHeadings(content) {
		const headings = [];
		if (!content) return headings;

		if (content.root && content.root.type === 'root') {
			extractLexicalHeadings(content.root, headings);
		}

		// Dedupe ids so two headings with the same text ("Round 1") still
		// get distinct anchors.
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
			// Level usually comes as `tag: 'h2'`; older shapes (`tag: 2`,
			// `level`, `format`) are still accepted so the TOC keeps h3+.
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
				? 'md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:left-1/2 md:z-[1] md:-translate-x-1/2 md:pb-14 md:[text-shadow:0_1px_2px_rgba(23,21,15,0.6),0_6px_24px_rgba(23,21,15,0.45)] lg:pb-16'
				: 'md:pt-12 md:pb-6'}"
		>
			<a
				href={rubricHref}
				class="pointer-events-auto inline-flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.24em] uppercase md:text-[11.5px] {hasCover
					? 'text-warm md:text-white/90'
					: 'text-warm'}"
			>
				<span class={hasCover ? 'text-warm md:text-warm-light' : 'text-warm'} aria-hidden="true"
					>◆</span
				>
				{rubricLabel}
				<span class={hasCover ? 'text-warm md:text-warm-light' : 'text-warm'} aria-hidden="true"
					>◆</span
				>
			</a>
			<h1
				use:fitTitle={{ key: data.article.title, phoneLines: 3 }}
				style="--tc: {Math.max(12, (data.article.title || '').length)};"
				class="article-title mt-2 font-newsreader leading-[1.0] font-semibold tracking-[-0.02em] [text-wrap:balance] md:mt-3 md:leading-[0.96] {hasCover
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
					{#if data.article.author.slug}
						<a
							href="/library/author/{data.article.author.slug}"
							class="pointer-events-auto font-extrabold tracking-[0.12em] uppercase {hasCover
								? 'text-ink hover:text-warm md:text-white/90 md:hover:text-warm-light'
								: 'text-ink hover:text-warm'}"
						>
							By {data.article.author.name}
						</a>
					{:else}
						<span
							class="font-extrabold tracking-[0.12em] uppercase {hasCover
								? 'text-ink md:text-white/90'
								: 'text-ink'}">By {data.article.author.name}</span
						>
					{/if}
					<span aria-hidden="true">·</span>
				{/if}
				{#if pubLabel || lengthLabel}
					<span class="font-semibold">{[pubLabel, lengthLabel].filter(Boolean).join(' · ')}</span>
				{/if}
				{#if data.isPremium}
					<span class="self-center"><PremiumTag /></span>
				{/if}
			</div>
		</div>
	</section>

	{#if data.article.videoLocked}
		<!-- Premium video, non-member: paywalled frame, no player -->
		<figure class="m-0 mx-auto w-full max-w-[1200px] px-5 pt-4 md:px-8 md:pt-6">
			<div
				class="fp-plate relative overflow-hidden bg-[#080b15] md:aspect-video"
				data-premium-cta="video-gate"
			>
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
					<AuthorCard
						variant="rail"
						author={data.article.author}
						bioHtml={authorBioHtml}
						links={authorLinks}
					/>
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
						data-share="copy_link"
						title="Copy link"
						aria-label="Copy link"
						class="flex h-8 w-8 cursor-pointer items-center justify-center border border-line2 bg-transparent text-[10.5px] font-extrabold text-soft transition-colors hover:border-accent hover:text-accent"
					>
						⧉
					</button>
					<button
						type="button"
						onclick={shareTwitter}
						data-share="x"
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
					data-article-body
					class="{data.isPreview
						? 'pointer-events-none blur-[7px] select-none'
						: ''} {ARTICLE_PROSE}"
				>
					{#if data.article.content}
						<RenderLexical content={data.article.content} {cardImages} />
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
				<div class="relative z-10 -mt-16 md:-mt-20" data-premium-cta="article-gate">
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
				<div class="lg:hidden">
					<AuthorCard author={data.article.author} bioHtml={authorBioHtml} links={authorLinks} />
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

<style>
	/* Headline size, as on the homepage hero: the max for the breakpoint,
	   reduced by a character-count estimate so long titles land near two
	   lines before JS runs; the fitTitle action then sets the exact size. */
	.article-title {
		--title-max: 38px;
		--title-w: calc(100vw - 40px);
		--title-lines: 3;
		font-size: clamp(
			calc(var(--title-max) * 0.55),
			calc(var(--title-w) * var(--title-lines) / (0.55 * var(--tc))),
			var(--title-max)
		);
	}
	@media (min-width: 768px) {
		.article-title {
			--title-max: clamp(46px, 5.6vw, 84px);
			--title-w: min(896px, 100vw - 64px);
			--title-lines: 2;
		}
	}
</style>
