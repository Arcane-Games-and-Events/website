import { error } from '@sveltejs/kit';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { db } from '$lib/server/db/index.js';
import { deskEntry } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { loadTagsForEntries } from '$lib/server/desk/list.js';
import {
	extractEntryCardNames,
	resolveCardImages,
	loadMedia,
	loadAuthor,
	countAuthorPieces,
	buildArticleShape
} from '$lib/server/desk/entryData.js';
import { mediaImagesById } from '$lib/server/media/library.js';
import { extractMediaIds } from '$lib/desk/render/lexical-utils.js';

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
		loadMedia(entry.coverImageId),
		loadMedia(entry.thumbnailImageId),
		loadAuthor(entry.authorId),
		countAuthorPieces(entry.authorId),
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

export async function load({ params, locals, setHeaders }) {
	const { slug } = params;

	try {
		// Desk entries are the only source of Library articles.
		const deskRow = await loadDeskEntryBySlug(slug);
		if (deskRow) {
			const article = await buildArticleShape(deskRow);

			// Card image resolution — walk both the body's card links AND any
			// inline decklist widget nodes so the reader's hover tooltips work.
			let cardImages = {};
			if (article.content) {
				const names = extractEntryCardNames(article.content);
				if (names.size > 0) cardImages = await resolveCardImages(names);
			}

			// Premium gating. A piece is free or premium, and premium is
			// permanent: nothing turns free with age.
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

			// Inline images: their responsive copies, blur and credit.
			const media = article.content ? await mediaImagesById(extractMediaIds(article.content)) : {};

			return { article, isPremium, isPreview, cardImages, media };
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
