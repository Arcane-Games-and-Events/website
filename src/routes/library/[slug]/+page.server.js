import { error } from '@sveltejs/kit';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { db } from '$lib/server/db/index.js';
import { deskEntry } from '$lib/server/db/schema.js';
import { and, count, eq, lte, or } from 'drizzle-orm';
import { loadTagsForEntries } from '$lib/server/desk/list.js';
import { getAuthorProfile, bioToHtml } from '$lib/server/desk/authorProfile.js';
import {
	extractEntryCardNames,
	resolveCardImages,
	loadMedia,
	loadAuthor,
	buildEntryVideo
} from '$lib/server/desk/entryData.js';
import { mediaImage } from '$lib/server/desk/image.js';

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

	const video = await buildEntryVideo(entry);

	return {
		id: entry.id,
		slug: entry.slug,
		title: entry.title,
		excerpt: entry.excerpt,
		content: entry.body,
		publishedAt: entry.publishedAt,
		accessMode: entry.accessMode,
		// `{ src, srcset, width, height, alt }` — the hero markup reads these.
		coverImage: mediaImage(cover),
		thumbnailImage: mediaImage(thumbnail),
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
