import { error } from '@sveltejs/kit';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { resolveCardImage, mapWithConcurrency } from '$lib/server/cards/index.js';
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskMedia, user as userTable } from '$lib/server/db/schema.js';
import { and, count, eq, lte, or } from 'drizzle-orm';
import { getMuxPlaybackToken, getMuxThumbnailToken } from '$lib/server/mux.js';
import { loadTagsForEntries } from '$lib/server/desk/list.js';
import { getAuthorProfile, bioToHtml } from '$lib/server/desk/authorProfile.js';

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
 * Walk a Lexical body and pull every card-linked name — from `card:` link
 * URLs (existing helper) AND from inline decklist widget nodes' parsedCards.
 * The decklist widget doesn't expose its cards as links, so its cards need a
 * dedicated walk. Returns the same Set shape as the legacy card extractor.
 */
function extractDeskEntryCardNames(body) {
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
 * Load a Desk entry by slug + related media/author rows. Returns null when the
 * slug doesn't exist OR the entry isn't publicly readable yet (drafts,
 * archived, and future-scheduled entries are all 404 to the reader).
 */
async function loadDeskEntryBySlug(slug) {
	const [entry] = await db.select().from(deskEntry).where(eq(deskEntry.slug, slug)).limit(1);
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

	const [cover, thumbnail, author, authorPieces, tagsByEntry] = await Promise.all([
		entry.coverImageId
			? db
					.select()
					.from(deskMedia)
					.where(eq(deskMedia.id, entry.coverImageId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null),
		entry.thumbnailImageId
			? db
					.select()
					.from(deskMedia)
					.where(eq(deskMedia.id, entry.thumbnailImageId))
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
			: Promise.resolve(null),
		entry.authorId
			? db
					.select({ n: count() })
					.from(deskEntry)
					.where(
						and(
							eq(deskEntry.authorId, entry.authorId),
							or(
								eq(deskEntry.status, 'published'),
								and(eq(deskEntry.status, 'scheduled'), lte(deskEntry.scheduledFor, new Date()))
							)
						)
					)
					.then((r) => Number(r[0]?.n ?? 0))
			: Promise.resolve(0),
		loadTagsForEntries([entry.id])
	]);

	return {
		entry,
		cover,
		thumbnail,
		author: author ? { ...author, pieces: authorPieces } : null,
		tags: tagsByEntry.get(entry.id) ?? []
	};
}

/**
 * Build the `article` shape the reader page consumes, including a `video`
 * field for the featured video slot.
 */
async function buildDeskArticleShape({ entry, cover, thumbnail, author, tags = [] }) {
	// The writer's Desk profile (byline name, title, bio, photo, links). A
	// missing table or failed lookup just falls back to the account name.
	let profile = null;
	if (author?.id) {
		try {
			profile = (await getAuthorProfile(author.id)).profile;
		} catch (err) {
			console.error('author profile lookup failed:', err);
		}
	}

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
		id: entry.id,
		slug: entry.slug,
		title: entry.title,
		excerpt: entry.excerpt,
		content: entry.body,
		publishedAt: entry.publishedAt,
		accessMode: entry.accessMode,
		// coverImage uses `.src` (not `.url`) because that's what the page's
		// hero markup reads. Uploads have no responsive variants yet, so
		// srcset stays undefined and the browser renders the single src.
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
					name: profile?.displayName || `${author.firstName} ${author.lastName || ''}`.trim(),
					slug: null,
					role: profile?.title || null,
					// escaped server-side: the reader page renders bio strings as HTML
					bio: profile?.bio ? bioToHtml(profile.bio) : null,
					profilePicture: profile?.avatar?.url || null,
					socialLinks: profile?.links || [],
					pieces: author.pieces || 0
				}
			: null,
		tags,
		readTime: entry.readTime || null,
		video
	};
}

export async function load({ params, locals, setHeaders }) {
	const { slug } = params;

	try {
		// Desk entries are the only source of Library articles.
		const deskRow = await loadDeskEntryBySlug(slug);
		if (deskRow) {
			const article = await buildDeskArticleShape(deskRow);

			// Card image resolution — walk both the body's card links AND any
			// inline decklist widget nodes so the reader's hover tooltips work.
			let cardImages = {};
			if (article.content) {
				const names = extractDeskEntryCardNames(article.content);
				if (names.size > 0) cardImages = await resolveCardImages(names);
			}

			// Premium gating. Per the memory note for the Desk: premium
			// entries stay premium forever — no 30-day-to-free cutover. So we
			// just check accessMode instead of `isPremiumNow`.
			const isPremium = article.accessMode === 'premium';
			let isPreview = false;
			let hasPremiumAccess = false;
			if (isPremium) {
				hasPremiumAccess = userHasPremiumAccess(locals.user);
				if (!hasPremiumAccess) {
					isPreview = true;
					// One paragraph only — it is rendered blurred behind the gate, so
					// nothing readable is served to a non-member.
					article.content = truncateContentForPreview(article.content, 1);
					// Premium video: never ship playback tokens or the YouTube id
					// to a non-member. The page renders a paywalled frame from the
					// poster instead of a player.
					if (article.video) {
						article.videoLocked = true;
						article.video = null;
					}
				}
			}

			if (!isPremium) {
				// Short edge cache so freshly-published edits appear within
				// ~1 minute. Individual reader pages aren't in Redis, so
				// this is the only cache layer to bound.
				setHeaders({
					'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
					vary: 'Cookie'
				});
			} else {
				setHeaders({ 'cache-control': 'private, no-store', vary: 'Cookie' });
			}

			return { article, isPremium, isPreview, cardImages };
		}

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
