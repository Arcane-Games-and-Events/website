import { hasVariants, variantUrl } from '$lib/server/desk/image.js';
import { db } from '$lib/server/db/index.js';
import { deskAuthorProfile, deskMedia } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { LINK_PLATFORMS, normalizeUrl } from '$lib/desk/authorLinks.js';

export const PROFILE_LIMITS = { name: 60, title: 80, bio: 600, links: 4, url: 300, label: 30 };

/** True when the error means migration 020 hasn't been applied yet. */
export function isMissingProfileTable(err) {
	const code = err?.code || err?.cause?.code;
	const msg = String(err?.message || err?.cause?.message || '');
	return code === '42P01' || (msg.includes('cms_author_profile') && msg.includes('does not exist'));
}

/** Author photos are small: serve the smallest resized copy when there is one. */
function avatarUrl(media) {
	if (!hasVariants(media)) return media.url;
	return variantUrl(media, Math.min(...media.variantWidths));
}

/**
 * Load a user's author profile.
 * @returns {Promise<{ available: boolean, profile: null | { displayName: string|null, title: string|null, bio: string|null, avatar: null | { id: string, url: string }, links: any[] } }>}
 */
export async function getAuthorProfile(userId) {
	try {
		const [row] = await db
			.select({
				displayName: deskAuthorProfile.displayName,
				title: deskAuthorProfile.title,
				bio: deskAuthorProfile.bio,
				links: deskAuthorProfile.links,
				avatar: deskMedia
			})
			.from(deskAuthorProfile)
			.leftJoin(deskMedia, eq(deskAuthorProfile.avatarMediaId, deskMedia.id))
			.where(eq(deskAuthorProfile.userId, userId))
			.limit(1);
		if (!row) return { available: true, profile: null };
		return {
			available: true,
			profile: {
				displayName: row.displayName,
				title: row.title,
				bio: row.bio,
				avatar: row.avatar?.id ? { id: row.avatar.id, url: avatarUrl(row.avatar) } : null,
				links: Array.isArray(row.links) ? row.links : []
			}
		};
	} catch (err) {
		if (isMissingProfileTable(err)) return { available: false, profile: null };
		throw err;
	}
}

const PLATFORM_IDS = new Set(LINK_PLATFORMS.map(([id]) => id));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip = (v, n) =>
	String(v ?? '')
		.trim()
		.slice(0, n);

/**
 * Validate and normalise profile form input.
 * @returns {{ ok: true, value: any } | { ok: false, error: string }}
 */
export function parseProfileInput(raw) {
	const L = PROFILE_LIMITS;
	const displayName = clip(raw.displayName, L.name);
	const title = clip(raw.title, L.title);
	const bio = String(raw.bio ?? '')
		.replace(/\r\n/g, '\n')
		.trim();
	if (bio.length > L.bio) return { ok: false, error: `Keep your bio under ${L.bio} characters.` };

	const avatarMediaId = clip(raw.avatarMediaId, 64) || null;
	if (avatarMediaId && !UUID.test(avatarMediaId))
		return { ok: false, error: 'That photo is invalid.' };

	let links = [];
	try {
		links = JSON.parse(raw.links || '[]');
	} catch {
		return { ok: false, error: 'Links could not be read.' };
	}
	if (!Array.isArray(links)) links = [];
	links = links
		.map((l) => ({
			platform: PLATFORM_IDS.has(l?.platform) ? l.platform : 'other',
			url: normalizeUrl(clip(l?.url, L.url)),
			customLabel: clip(l?.customLabel, L.label)
		}))
		.filter((l) => l.url)
		.slice(0, L.links);
	for (const l of links) {
		try {
			const u = new URL(l.url);
			if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
		} catch {
			return { ok: false, error: `“${l.url}” isn't a valid link.` };
		}
	}

	return {
		ok: true,
		value: {
			displayName: displayName || null,
			title: title || null,
			bio: bio || null,
			avatarMediaId,
			links
		}
	};
}

/** Insert or update a user's profile. Throws if the table is missing. */
export async function saveAuthorProfile(userId, value) {
	const row = { ...value, updatedAt: new Date() };
	await db
		.insert(deskAuthorProfile)
		.values({ userId, ...row })
		.onConflictDoUpdate({ target: deskAuthorProfile.userId, set: row });
}

export { bioToHtml } from '$lib/desk/authorLinks.js';
