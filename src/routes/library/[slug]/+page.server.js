import { error } from '@sveltejs/kit';
import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow, userHasPremiumAccess } from '$lib/server/articles/access.js';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';
import { resolveCardImage, mapWithConcurrency } from '$lib/server/cards/index.js';
import { enrichPageViewWithArticle } from '$lib/server/analytics.js';
import { db } from '$lib/server/db/index.js';
import { cmsEntry, cmsMedia, user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getMuxPlaybackToken, getMuxThumbnailToken } from '$lib/server/mux.js';

/**
 * Truncate Lexical content to only show first few paragraphs for preview
 * This ensures non-premium users cannot see full content even via dev tools
 */
function truncateContentForPreview(content, maxParagraphs = 3) {
	if (!content || !content.root) return content;

	const root = content.root;
	if (!root.children || !Array.isArray(root.children)) return content;

	// Count paragraphs and keep only the first few
	let paragraphCount = 0;
	const truncatedChildren = [];

	for (const child of root.children) {
		if (child.type === 'paragraph') {
			paragraphCount++;
			if (paragraphCount <= maxParagraphs) {
				truncatedChildren.push(child);
			} else {
				break;
			}
		} else if (child.type === 'heading' && paragraphCount < maxParagraphs) {
			// Include headings that come before we hit the limit
			truncatedChildren.push(child);
		} else if (paragraphCount >= maxParagraphs) {
			break;
		} else {
			// Include other content types before limit
			truncatedChildren.push(child);
		}
	}

	return {
		...content,
		root: {
			...root,
			children: truncatedChildren
		}
	};
}

/**
 * Extract card names from Lexical content (looks for card: links)
 */
function extractCardNamesFromContent(node, cardNames = new Set()) {
	if (!node) return cardNames;

	// Check for link nodes with card: URLs
	if (node.type === 'link' || node.type === 'autolink') {
		const url = node.fields?.url || node.url || '';
		const cardMatch = url.match(/^#?card:(.+)$/);
		if (cardMatch) {
			let cardId = cardMatch[1];
			// Handle separators for custom URLs
			const separatorIndex = cardId.search(/[|]|%7C|::|--/);
			if (separatorIndex !== -1) {
				cardId = cardId.substring(0, separatorIndex);
			}
			// Remove pitch indicator [r], [y], [b]
			const pitchMatch = cardId.match(/\[(r|y|b)\]$/i);
			let pitch = null;
			if (pitchMatch) {
				pitch = pitchMatch[1].toLowerCase();
				cardId = cardId.replace(/\[(r|y|b)\]$/i, '').trim();
			}
			// Decode URL-encoded card names (e.g., Felling%20of%20the%20Crown -> Felling of the Crown)
			try {
				cardId = decodeURIComponent(cardId);
			} catch (e) {
				// Keep original if decoding fails
			}
			// Store with pitch info
			cardNames.add(JSON.stringify({ name: cardId, pitch }));
		}
	}

	// Recursively process children
	if (node.children && Array.isArray(node.children)) {
		node.children.forEach((child) => extractCardNamesFromContent(child, cardNames));
	}

	// Handle root node
	if (node.root) {
		extractCardNamesFromContent(node.root, cardNames);
	}

	return cardNames;
}

/**
 * Extract card names from decklists
 */
function extractCardNamesFromDecklists(decklists) {
	const cardNames = new Set();
	if (!decklists || !Array.isArray(decklists)) return cardNames;

	for (const decklist of decklists) {
		// Hero
		if (decklist.hero) {
			cardNames.add(JSON.stringify({ name: decklist.hero, pitch: null }));
		}

		// Arena cards
		if (decklist.parsedCards?.arenaCards) {
			for (const card of decklist.parsedCards.arenaCards) {
				cardNames.add(JSON.stringify({ name: card.name, pitch: null }));
			}
		}

		// Deck cards
		if (decklist.parsedCards?.deckCards) {
			for (const card of decklist.parsedCards.deckCards) {
				const pitch =
					card.color === 'red'
						? 'r'
						: card.color === 'yellow'
							? 'y'
							: card.color === 'blue'
								? 'b'
								: null;
				cardNames.add(JSON.stringify({ name: card.name, pitch }));
			}
		}
	}

	return cardNames;
}

/**
 * Resolve card images for a set of card names.
 * Returns a map of "cardName:pitch" -> { imageUrl, fallbackUrl }.
 *
 * Concurrency is capped at 8 in-flight lookups via `mapWithConcurrency`
 * so a deck-tech article with 70+ unique cards doesn't fire 70+
 * simultaneous DB lookups on a cold cache — that used to saturate the
 * Postgres connection pool and make the `load` function hang.
 */
async function resolveCardImages(cardNamesSet) {
	const cardImages = {};
	const cards = Array.from(cardNamesSet).map((json) => JSON.parse(json));

	await mapWithConcurrency(cards, 8, async ({ name, pitch }) => {
		const pitchNum = pitch === 'r' ? 1 : pitch === 'y' ? 2 : pitch === 'b' ? 3 : null;
		const resolved = await resolveCardImage({ name, pitch: pitchNum });

		if (resolved.found) {
			// Store with pitch key for specific lookups
			const key = pitch ? `${name.toLowerCase()}:${pitch}` : name.toLowerCase();
			cardImages[key] = {
				imageUrl: resolved.imageUrl,
				fallbackUrl: resolved.fallbackUrl
			};
			// Also store without pitch for fallback
			if (pitch && !cardImages[name.toLowerCase()]) {
				cardImages[name.toLowerCase()] = {
					imageUrl: resolved.imageUrl,
					fallbackUrl: resolved.fallbackUrl
				};
			}
		}
	});

	return cardImages;
}

/**
 * Recursively process Lexical content to convert relative URLs to absolute
 */
function processContentUrls(node) {
	if (!node) return node;

	// Handle upload nodes (inline images)
	if (node.type === 'upload' && node.value) {
		return {
			...node,
			value: {
				...node.value,
				url: payload.getAbsoluteUrl(node.value.url)
			}
		};
	}

	// Recursively process children
	if (node.children && Array.isArray(node.children)) {
		return {
			...node,
			children: node.children.map((child) => processContentUrls(child))
		};
	}

	// Handle root node
	if (node.root) {
		return {
			...node,
			root: processContentUrls(node.root)
		};
	}

	return node;
}

/**
 * Walk a Lexical body and pull every card-linked name — from `card:` link
 * URLs (existing helper) AND from inline decklist widget nodes' parsedCards.
 * The decklist widget doesn't expose its cards as links, so its cards need a
 * dedicated walk. Returns the same Set shape as the legacy card extractor.
 */
function extractCmsEntryCardNames(body) {
	const names = extractCardNamesFromContent(body);
	function walk(node) {
		if (!node) return;
		if (node.type === 'decklist' && node.parsedCards) {
			const { arenaCards = [], deckCards = [] } = node.parsedCards;
			for (const c of arenaCards) {
				if (c?.name) names.add(JSON.stringify({ name: c.name, pitch: null }));
			}
			for (const c of deckCards) {
				if (!c?.name) continue;
				const pitch =
					c.color === 'red' ? 'r' : c.color === 'yellow' ? 'y' : c.color === 'blue' ? 'b' : null;
				names.add(JSON.stringify({ name: c.name, pitch }));
			}
		}
		if (Array.isArray(node.children)) node.children.forEach(walk);
		if (node.root) walk(node.root);
	}
	walk(body);
	return names;
}

/**
 * Load a CMS entry by slug + related media/author rows. Returns null when the
 * slug doesn't exist OR the entry isn't publicly readable yet (drafts,
 * archived, and future-scheduled entries are all 404 to the reader).
 */
async function loadCmsEntryBySlug(slug) {
	const [entry] = await db.select().from(cmsEntry).where(eq(cmsEntry.slug, slug)).limit(1);
	if (!entry) return null;

	// Public visibility: published, OR scheduled with a start time that has
	// already arrived (the DB status may lag until the next update).
	const now = Date.now();
	const isPublic =
		entry.status === 'published' ||
		(entry.status === 'scheduled' &&
			entry.scheduledFor &&
			new Date(entry.scheduledFor).getTime() <= now);
	if (!isPublic) return null;

	const [cover, thumbnail, author] = await Promise.all([
		entry.coverImageId
			? db
					.select()
					.from(cmsMedia)
					.where(eq(cmsMedia.id, entry.coverImageId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null),
		entry.thumbnailImageId
			? db
					.select()
					.from(cmsMedia)
					.where(eq(cmsMedia.id, entry.thumbnailImageId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null),
		entry.authorId
			? db
					.select({
						id: userTable.id,
						firstName: userTable.firstName,
						lastName: userTable.lastName
					})
					.from(userTable)
					.where(eq(userTable.id, entry.authorId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null)
	]);

	return { entry, cover, thumbnail, author };
}

/**
 * Build the unified `article` shape the reader page consumes. Same shape as
 * the Payload path returns, plus a `video` field for the featured video slot
 * and `source: 'cms'` so the page can pick the right renderer.
 */
async function buildCmsArticleShape({ entry, cover, thumbnail, author }) {
	let video = null;
	if (entry.videoProvider === 'mux' && entry.muxPlaybackId) {
		const [playbackToken, thumbnailToken] = await Promise.all([
			getMuxPlaybackToken(entry.muxPlaybackId),
			getMuxThumbnailToken(entry.muxPlaybackId)
		]);
		video = {
			provider: 'mux',
			muxPlaybackId: entry.muxPlaybackId,
			playbackToken,
			thumbnailToken,
			duration: entry.videoDuration,
			aspectRatio: entry.videoAspectRatio
		};
	} else if (entry.videoProvider === 'youtube' && entry.youtubeVideoId) {
		video = {
			provider: 'youtube',
			youtubeVideoId: entry.youtubeVideoId,
			youtubeTitle: entry.youtubeTitle,
			youtubeThumbnailUrl: entry.youtubeThumbnailUrl,
			youtubeDuration: entry.youtubeDuration
		};
	}

	return {
		slug: entry.slug,
		title: entry.title,
		excerpt: entry.excerpt,
		content: entry.body,
		publishedAt: entry.publishedAt,
		accessMode: entry.accessMode,
		// coverImage uses `.src` (not `.url`) to match the shape the Payload
		// path produces so the existing page.svelte hero-image markup works
		// for both sources without a compatibility branch. srcset is left
		// undefined — CMS uploads don't produce responsive variants yet, the
		// browser will just render the single src.
		coverImage: cover
			? {
					src: cover.url,
					alt: cover.alt || '',
					width: cover.width || null,
					height: cover.height || null
				}
			: null,
		thumbnailImage: thumbnail
			? {
					src: thumbnail.url,
					alt: thumbnail.alt || ''
				}
			: null,
		author: author
			? {
					name: `${author.firstName} ${author.lastName || ''}`.trim(),
					slug: null,
					bio: null,
					profilePicture: null,
					socialLinks: []
				}
			: null,
		tags: [],
		decklists: [],
		readTime: entry.readTime || null,
		video,
		source: 'cms'
	};
}

export async function load({ params, locals, setHeaders }) {
	const { slug } = params;

	try {
		// --------------------------------------------------------------------
		// Try CMS entry first — this is the read path for custom-authored
		// entries. If the slug doesn't match a public CMS entry, fall through
		// to the Payload path below (existing articles migrate over time).
		// --------------------------------------------------------------------
		const cmsRow = await loadCmsEntryBySlug(slug);
		if (cmsRow) {
			const article = await buildCmsArticleShape(cmsRow);

			// Card image resolution — walk both the body's card links AND any
			// inline decklist widget nodes so the reader's hover tooltips work.
			let cardImages = {};
			if (article.content) {
				const names = extractCmsEntryCardNames(article.content);
				if (names.size > 0) cardImages = await resolveCardImages(names);
			}

			// Premium gating. Per the memory note for the custom CMS: premium
			// entries stay premium forever — no 30-day-to-free cutover. So we
			// just check accessMode instead of `isPremiumNow`.
			const isPremium = article.accessMode === 'premium';
			let isPreview = false;
			let hasPremiumAccess = false;
			if (isPremium) {
				hasPremiumAccess = userHasPremiumAccess(locals.user);
				if (!hasPremiumAccess) {
					isPreview = true;
					article.content = truncateContentForPreview(article.content);
				}
			}

			if (!isPremium) {
				setHeaders({
					'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
					vary: 'Cookie'
				});
			} else {
				setHeaders({ 'cache-control': 'private, no-store', vary: 'Cookie' });
			}

			const pageViewId = locals.pageViewId || null;
			if (pageViewId) {
				enrichPageViewWithArticle(pageViewId, {
					title: article.title,
					author: article.author?.name || null,
					tags: null,
					accessMode: article.accessMode || null
				});
			}

			return { article, isPremium, isPreview, cardImages, pageViewId };
		}

		// Payload is turned off — CMS is the single source for library
		// content. Anything without a matching public cms_entry is a 404.
		throw error(404, 'Article not found');
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err.status) {
			throw err;
		}

		console.error('Error fetching article:', err);
		throw error(500, 'Failed to load article');
	}
}
