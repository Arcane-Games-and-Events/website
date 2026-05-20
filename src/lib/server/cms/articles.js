/**
 * CMS article server helpers — slug generation, save with revision snapshot,
 * read-time calculation. Used by both the API endpoints and the admin pages.
 */
import { db } from '$lib/server/db/index.js';
import { cmsArticle, cmsRevision } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { calculateReadTime, lexicalToText } from '$lib/cms/render/lexical-utils.js';

/**
 * Convert a title into a URL-safe slug. Returns empty string if title is blank.
 */
export function titleToSlug(title) {
	return String(title || '')
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

/**
 * Find a slug not already in use by an article. If `desired` is taken, append
 * `-2`, `-3`, etc. The current article (excludeId) is ignored when checking.
 */
export async function findFreeSlug(desired, excludeId = null) {
	let base = desired || 'untitled';
	let candidate = base;
	let n = 2;
	while (await isSlugTaken(candidate, excludeId)) {
		candidate = `${base}-${n}`;
		n++;
	}
	return candidate;
}

async function isSlugTaken(slug, excludeId) {
	const rows = await db
		.select({ id: cmsArticle.id })
		.from(cmsArticle)
		.where(
			excludeId
				? sql`${cmsArticle.slug} = ${slug} AND ${cmsArticle.id} != ${excludeId}`
				: eq(cmsArticle.slug, slug)
		)
		.limit(1);
	return rows.length > 0;
}

/**
 * Generate an excerpt from a Lexical doc — first ~30 words of plain text.
 * Used as a default when the author hasn't set one.
 */
export function deriveExcerpt(body, maxWords = 30) {
	const text = lexicalToText(body);
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length <= maxWords) return text.trim();
	return words.slice(0, maxWords).join(' ').trim() + '…';
}

/**
 * Create a new article and seed an initial revision.
 *
 * @param {object} input - { title, slug?, body, excerpt?, accessMode?, coverImageId?, authorId, status? }
 * @returns the created row
 */
export async function createArticle(input) {
	const slug = await findFreeSlug(input.slug || titleToSlug(input.title) || 'untitled');
	const body = input.body || null;
	const readTime = body ? calculateReadTime(body) : 1;

	const [row] = await db
		.insert(cmsArticle)
		.values({
			slug,
			title: input.title || 'Untitled',
			excerpt: input.excerpt || (body ? deriveExcerpt(body) : null),
			coverImageId: input.coverImageId || null,
			body,
			readTime,
			accessMode: input.accessMode || 'free',
			status: input.status || 'draft',
			authorId: input.authorId,
			source: 'custom',
			updatedAt: new Date()
		})
		.returning();

	if (body) {
		await db.insert(cmsRevision).values({
			entityType: 'article',
			entityId: row.id,
			body,
			savedBy: input.authorId
		});
	}
	return row;
}

/**
 * Whether changes on this article should be staged in the draft_* buffer
 * rather than written directly to the live columns.
 *
 * - Plain drafts (status='draft' or 'archived'): edits go straight to live —
 *   nothing is publicly visible yet, so no buffering needed.
 * - Published or scheduled articles: edits stage so an admin can approve.
 */
function shouldBufferEdits(existing) {
	return existing.status === 'published' || existing.status === 'scheduled';
}

/**
 * Update an article. Saves a revision snapshot every call (the editor debounces
 * autosaves so we don't get one-revision-per-keystroke).
 *
 * For live articles (published or scheduled), content edits — title, excerpt,
 * body, cover image — are routed into the draft_* columns. The public site
 * keeps showing the live values until an admin calls approveArticleDraft().
 *
 * Status-changing operations (publish, schedule, archive, unpublish) and
 * authorId reassignments always go to the live columns regardless of status.
 *
 * @param {string} id
 * @param {object} patch - any subset of editable fields
 * @param {object} actor - { id, role } for revision attribution
 */
export async function updateArticle(id, patch, actor) {
	const [existing] = await db
		.select()
		.from(cmsArticle)
		.where(eq(cmsArticle.id, id))
		.limit(1);
	if (!existing) throw new Error('Article not found');

	const updates = { updatedAt: new Date() };
	const buffering = shouldBufferEdits(existing);
	let touchedDraft = false;

	// --- Slug always goes live: changing slug while published would break
	// existing public links, so we let admins do it explicitly. The API guard
	// further restricts who can change it.
	if (typeof patch.slug === 'string' && patch.slug !== existing.slug) {
		updates.slug = await findFreeSlug(titleToSlug(patch.slug) || existing.slug, id);
	}

	// --- Title
	if (typeof patch.title === 'string') {
		const next = patch.title || existing.title;
		if (buffering) {
			updates.draftTitle = next;
			touchedDraft = true;
		} else {
			updates.title = next;
		}
	}

	// --- Excerpt
	if ('excerpt' in patch) {
		if (buffering) {
			updates.draftExcerpt = patch.excerpt;
			touchedDraft = true;
		} else {
			updates.excerpt = patch.excerpt;
		}
	}

	// --- Body (and derived read time)
	if (patch.body !== undefined) {
		const rt = patch.body ? calculateReadTime(patch.body) : existing.readTime;
		if (buffering) {
			updates.draftBody = patch.body;
			updates.draftReadTime = rt;
			touchedDraft = true;
		} else {
			updates.body = patch.body;
			updates.readTime = rt;
		}
	}

	// --- Cover image
	if ('coverImageId' in patch) {
		if (buffering) {
			updates.draftCoverImageId = patch.coverImageId;
			touchedDraft = true;
		} else {
			updates.coverImageId = patch.coverImageId;
		}
	}

	// --- accessMode goes live (admin-only behavior; gating is up-stack).
	if ('accessMode' in patch) updates.accessMode = patch.accessMode;
	if ('authorId' in patch) updates.authorId = patch.authorId;

	// --- Status transitions always touch live fields.
	if ('status' in patch) {
		updates.status = patch.status;
		if (patch.status === 'published' && !existing.publishedAt) {
			updates.publishedAt = new Date();
		}
		if (patch.status !== 'scheduled') {
			updates.scheduledFor = null;
		}
	}
	if ('scheduledFor' in patch) updates.scheduledFor = patch.scheduledFor;

	if (touchedDraft) {
		updates.draftUpdatedAt = new Date();
		updates.draftUpdatedBy = actor?.id || null;
	}

	await db.update(cmsArticle).set(updates).where(eq(cmsArticle.id, id));

	if (patch.body !== undefined) {
		await db.insert(cmsRevision).values({
			entityType: 'article',
			entityId: id,
			body: patch.body,
			savedBy: actor?.id || null
		});
	}

	const [updated] = await db
		.select()
		.from(cmsArticle)
		.where(eq(cmsArticle.id, id))
		.limit(1);
	return updated;
}

/**
 * Push the buffered draft fields onto the live columns. No-op if nothing has
 * been staged. Resets the draft buffer.
 */
export async function approveArticleDraft(id, actor) {
	const [existing] = await db
		.select()
		.from(cmsArticle)
		.where(eq(cmsArticle.id, id))
		.limit(1);
	if (!existing) throw new Error('Article not found');
	if (!existing.draftUpdatedAt) {
		// Nothing to approve — return as-is.
		return existing;
	}

	const updates = {
		updatedAt: new Date(),
		// Clear the buffer once we copy it forward.
		draftTitle: null,
		draftExcerpt: null,
		draftBody: null,
		draftCoverImageId: null,
		draftReadTime: null,
		draftUpdatedAt: null,
		draftUpdatedBy: null
	};
	if (existing.draftTitle != null) updates.title = existing.draftTitle;
	if (existing.draftExcerpt !== undefined && existing.draftExcerpt !== null) {
		updates.excerpt = existing.draftExcerpt;
	}
	if (existing.draftBody != null) {
		updates.body = existing.draftBody;
		updates.readTime = existing.draftReadTime ?? calculateReadTime(existing.draftBody);
	}
	if (existing.draftCoverImageId != null) updates.coverImageId = existing.draftCoverImageId;

	await db.update(cmsArticle).set(updates).where(eq(cmsArticle.id, id));

	// Snapshot the body that just went live so revision history is faithful.
	if (existing.draftBody != null) {
		await db.insert(cmsRevision).values({
			entityType: 'article',
			entityId: id,
			body: existing.draftBody,
			savedBy: actor?.id || null
		});
	}

	const [updated] = await db
		.select()
		.from(cmsArticle)
		.where(eq(cmsArticle.id, id))
		.limit(1);
	return updated;
}

/**
 * Throw away the buffered draft fields without applying them. Live columns
 * are unchanged.
 */
export async function discardArticleDraft(id) {
	await db
		.update(cmsArticle)
		.set({
			updatedAt: new Date(),
			draftTitle: null,
			draftExcerpt: null,
			draftBody: null,
			draftCoverImageId: null,
			draftReadTime: null,
			draftUpdatedAt: null,
			draftUpdatedBy: null
		})
		.where(eq(cmsArticle.id, id));

	const [updated] = await db
		.select()
		.from(cmsArticle)
		.where(eq(cmsArticle.id, id))
		.limit(1);
	return updated;
}
