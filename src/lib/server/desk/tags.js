/**
 * Library tags (topics). Each entry is filed under one tag at most: it is
 * the rubric above the piece's title and decides which tag page
 * (`/library/tag/{slug}`) the piece appears on. Tags are shared; anyone who
 * can write in the Desk can pick one or start a new one.
 */
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskEntryTag, deskTag } from '$lib/server/db/schema.js';
import { asc, eq, sql } from 'drizzle-orm';
import { titleToSlug } from '$lib/desk/slug.js';

/** Longest tag name allowed. */
export const TAG_NAME_MAX = 40;

export class TagError extends Error {
	/** @param {number} status @param {string} message */
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

/**
 * A tag name as it should be stored: trimmed, single-spaced, at most
 * TAG_NAME_MAX characters.
 * @param {string} name
 */
export function cleanTagName(name) {
	return String(name ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, TAG_NAME_MAX)
		.trim();
}

/**
 * Every tag, A to Z, with how many entries are filed under it (any status)
 * and how many of those are live.
 * @returns {Promise<{ id: string, name: string, slug: string, count: number, live: number }[]>}
 */
export async function listTags() {
	return db
		.select({
			id: deskTag.id,
			name: deskTag.name,
			slug: deskTag.slug,
			count: sql`count(${deskEntry.id})::int`,
			live: sql`count(${deskEntry.id}) filter (where ${deskEntry.status} in ('published', 'scheduled'))::int`
		})
		.from(deskTag)
		.leftJoin(deskEntryTag, eq(deskEntryTag.tagId, deskTag.id))
		.leftJoin(deskEntry, eq(deskEntry.id, deskEntryTag.entryId))
		.groupBy(deskTag.id)
		.orderBy(asc(deskTag.name));
}

/** @param {string} slug */
export async function getTagBySlug(slug) {
	const [row] = await db.select().from(deskTag).where(eq(deskTag.slug, slug)).limit(1);
	return row ?? null;
}

/** @param {string} id */
export async function getTag(id) {
	const [row] = await db.select().from(deskTag).where(eq(deskTag.id, id)).limit(1);
	return row ?? null;
}

/**
 * The tag with this name, made if it doesn't exist yet. Names that make the
 * same web address ("Deck tech", "Deck Tech") are the same tag, so the
 * existing one is returned rather than a near-duplicate.
 * @param {string} rawName
 * @returns {Promise<{ tag: typeof deskTag.$inferSelect, created: boolean }>}
 */
export async function findOrCreateTag(rawName) {
	const name = cleanTagName(rawName);
	const slug = titleToSlug(name);
	if (!name || !slug) throw new TagError(400, 'Give the tag a name with letters or numbers in it.');
	const existing = await getTagBySlug(slug);
	if (existing) return { tag: existing, created: false };
	const [row] = await db
		.insert(deskTag)
		.values({ name, slug })
		.onConflictDoNothing({ target: deskTag.slug })
		.returning();
	// Someone else made it a moment ago.
	if (!row) return { tag: /** @type {any} */ (await getTagBySlug(slug)), created: false };
	return { tag: row, created: true };
}

/**
 * The tag an entry is filed under, or null.
 * @param {string} entryId
 */
export async function getEntryTag(entryId) {
	const [row] = await db
		.select({ id: deskTag.id, name: deskTag.name, slug: deskTag.slug })
		.from(deskEntryTag)
		.innerJoin(deskTag, eq(deskTag.id, deskEntryTag.tagId))
		.where(eq(deskEntryTag.entryId, entryId))
		.orderBy(asc(deskTag.name))
		.limit(1);
	return row ?? null;
}

/**
 * File an entry under one tag, replacing any it had; null removes it.
 * @param {string} entryId
 * @param {string | null} tagId
 * @returns {Promise<boolean>} true when the entry's tag changed
 */
export async function setEntryTag(entryId, tagId) {
	return db.transaction(async (tx) => {
		const current = await tx
			.select({ tagId: deskEntryTag.tagId })
			.from(deskEntryTag)
			.where(eq(deskEntryTag.entryId, entryId));
		if (tagId ? current.length === 1 && current[0].tagId === tagId : current.length === 0) {
			return false;
		}
		await tx.delete(deskEntryTag).where(eq(deskEntryTag.entryId, entryId));
		if (tagId) await tx.insert(deskEntryTag).values({ entryId, tagId });
		return true;
	});
}
